const Neuron = require("./Neuron");
const Sensors = require("./Sensors");
const Actions = require("./Actions");
const Hyperparams = require("../Hyperparameters");

// Each gene specifies one synaptic connection in a neural net. Each
// connection has an input (source) which is either a sensor or another neuron.
// Each connection has an output, which is either an action or another neuron.
// Each connection has a floating point weight derived from a signed 16-bit
// value. The signed integer weight is scaled to a small range, then cubed
// to provide fine resolution near zero.
const SENSOR = 1; // always a source
const ACTION = 1; // always a sink
const NEURON = 0; // can be either a source or sink

class NeuralNet {
    constructor(genome){
        this.genome = genome;
        this.connections = []; // Array of genes
        this.neurons = [];

        let connectionList = [];
        let nodeMap = new Map(); // Intermediate map used when converting genes into the neural net
        // Convert the indiv's genome to a renumbered connection list
        makeRenumberedConnectionList(connectionList);
        // Make a node (neuron) list from the renumbered connection list
        makeNodeList(connectionList, nodeMap);
        // Find and remove neurons that don't feed anything or only feed themself.
        // This reiteratively removes all connections to the useless neurons.
        cullUselessNeurons(connectionList, nodeMap);

        // The neurons map now has all the referenced neurons, their neuron numbers, and
        // the number of outputs for each neuron. Now we'll renumber the neurons
        // starting at zero.
        let newNumber = 0;
        for (var [number, neuron] of nodeMap) {
            neuron.remappedNumber = newNumber++;
        }

        // Create the indiv's connection list in two passes:
        // First the connections to neurons, then the connections to actions.
        // This ordering optimizes the feed-forward function
        // First, the connections from sensor or neuron to a neuron
        for (conn in connectionList) {
            if (conn.sinkType == NEURON) {
                this.connections.push(conn);
                let newConn = this.connections[-1];
                // fix the destination neuron number
                newConn.sinkNum = nodeMap.get(newConn.sinkNum).remappedNumber;
                // if the source is a neuron, fix its number too
                if (newConn.sourceType == NEURON) {
                    newConn.sourceNum = nodeMap.get(newConn.sourceNum).remappedNumber;
                }
            }
        }

        // Last, the connections from sensor or neuron to an action
        for (conn in connectionList) {
            if (conn.sinkType == ACTION) {
                this.connections.push(conn);
                let newConn = this.connections[-1];
                // if the source is a neuron, fix its number
                if (newConn.sourceType == NEURON) {
                    newConn.sourceNum = nodeMap.at(newConn.sourceNum).remappedNumber;
                }
            }
        }

        // Create the indiv's neural node list
        for (var neuronNum = 0; neuronNum < nodeMap.size; ++neuronNum) {
            let isDriven = nodeMap.at(neuronNum).numInputsFromSensorsOrOtherNeurons != 0;
            this.neurons.push( { output: 0.5, driven: isDriven } );
        }

    }

    // Convert the indiv's genome to a renumbered connection list
    // This renumbers the neurons from their 16 bit values in the genome
    // to the range 0..p.maxNumberNeurons - 1 by using a modulo operator.
    // Sensors are renumbered 0..Sensor::NUM_SENSES - 1
    // Actions are renumbered 0..Action::NUM_ACTIONS - 1
    makeRenumberedConnectionList(connectionList) {
        connectionList.clear();
        for (gene in this.genome) {
            connectionList.push(gene);
            let conn = connectionList[-1];
            if (conn.sourceType == NEURON) {
                conn.sourceNum %= HyperParams.numNeurons;
            } else {
                conn.sourceNum %= Sensors.numSensors;
            }

            if (conn.sinkType == NEURON) {
                conn.sinkNum %= HyperParams.numNeurons;
            } else {
                conn.sinkNum %= Actions.numActions;
            }
        }
    }

    // Scan the connections and make a list of all the neuron numbers
    // mentioned in the connections. Also keep track of how many inputs and
    // outputs each neuron has.
    // Node object: {remappedNumber, numOutputs, numSelfInputs, numInputsFromSensorsOrOtherNeurons}
    makeNodeList(connectionList, nodeMap) {
        nodeMap.clear();
        for (conn in connectionList) {
            if (conn.sinkType == NEURON) {
                let selfInput = conn.sourceType == NEURON && (conn.sourceNum == conn.sinkNum);
                if (nodeMap.has(conn.sinkNum)) {
                    let it = nodeMap.get(conn.sinkNum);
                    if (selfInput) it.numSelfInputs++;
                    else it.numInputsFromSensorsOrOtherNeurons++;
                } else {
                    nodeMap.set(conn.sinkNum, 
                        {   
                            numOutputs: 0, 
                            numSelfInputs: selfInput ? 1 : 0, 
                            numInputsFromSensorsOrOtherNeurons: selfInput ? 0 : 1
                        });
                }
            }
            if (conn.sourceType == NEURON) {
                if (nodeMap.has(conn.sourceNum)) {
                    let it = nodeMap.get(conn.sourceNum);
                    it.numOutputs++;
                } else {
                    nodeMap.set(conn.sourceNum, 
                        {   
                            numOutputs: 0, 
                            numSelfInputs: 0, 
                            numInputsFromSensorsOrOtherNeurons: 0
                        });
                }
                
            }
        }
    }

    removeConnectionsToNeuron(connectionList, nodeMap, neuronNumber) {
        for (let i = 0; i < connectionList.length;) {
            let itConn = connectionList[i];
            if (itConn.sinkType == NEURON && itConn.sinkNum == neuronNumber) {
                // Remove the connection. If the connection source is from another
                // neuron, also decrement the other neuron's numOutputs:
                if (itConn.sourceType == NEURON) {
                    nodeMap.get(itConn.sourceNum).numOutputs--;
                }
                itConn = connectionList.splice(itConn);
            } else {
                i++;
            }
        }
    }

    // Find and remove neurons that don't feed anything or only feed themself.
    // This reiteratively removes all connections to the useless neurons.
    cullUselessNeurons(nodeMap) {
        let allDone = false;
        while (!allDone) {
            allDone = true;
            let mapIter = nodeMap.entries();
            for (let mapItem = mapIter.next(); !mapItem.done) {
                let neuron = mapItem.value[1];
                // We're looking for neurons with zero outputs, or neurons that feed itself
                // and nobody else:
                if (neuron.numOutputs == neuron.numSelfInputs) {  // could be 0
                    allDone = false;
                    // Find and remove connections from sensors or other neurons
                    removeConnectionsToNeuron(nodeMap, mapItem.value[0]);
                    nodeMap.delete(mapItem.value[0]);
                } else {
                    mapItem = mapIter.next();
                }
            }
        }
    }
}

module.exports = NeuralNet;