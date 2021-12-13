const Neuron = require("./Neuron");
const Actions = require("./Actions");
const HyperParams = require("../../Hyperparameters");
const _ = require("lodash");

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
    constructor(genome, numSensorNeurons) {
        this.genome = _.cloneDeep(genome); // deep copy of genome
        this.neurons = [];
        this.connections = [];
        this.numSensorNeurons = numSensorNeurons;
        this.createWiringFromGenome();
    }

    createWiringFromGenome() {
        this.connections = []; // Array of genes
        this.neurons = [];

        // Convert the indiv's genome to a renumbered connection list
        let connectionList = this.makeRenumberedConnectionList();

        // Make a node (neuron) list from the renumbered connection list
        let nodeMap = this.makeNodeList(connectionList);
        
        // Find and remove neurons that don't feed anything or only feed themself.
        // This reiteratively removes all connections to the useless neurons.
        this.cullUselessNeurons(connectionList, nodeMap);

        // The neurons map now has all the referenced neurons, their neuron numbers, and
        // the number of outputs for each neuron. Now we'll renumber the neurons
        // starting at zero.
        let newNumber = 0;
        for (var [number, neuron] of nodeMap) {
            neuron.remappedNumber = newNumber++;
        }

        // Create the org's true connection list in two passes:
        // First the connections to neurons, then the connections to actions.
        // This ordering optimizes the feed-forward function
        // First, the connections from sensor or neuron to a neuron
        for (var conn of connectionList) {
            if (conn.sinkType == NEURON) {
                let newConn = _.cloneDeep(conn);
                // fix the destination neuron number
                newConn.sinkNum = nodeMap.get(newConn.sinkNum).remappedNumber;
                // if the source is a neuron, fix its number too
                if (newConn.sourceType == NEURON) {
                    newConn.sourceNum = nodeMap.get(newConn.sourceNum).remappedNumber;
                }
                this.connections.push(newConn);
            }
        }

        // Last, the connections from sensor or neuron to an action
        for (var conn of connectionList) {
            if (conn.sinkType == ACTION) {
                let newConn = _.cloneDeep(conn);
                // if the source is a neuron, fix its number
                if (newConn.sourceType == NEURON) {
                    newConn.sourceNum = nodeMap.get(newConn.sourceNum).remappedNumber;
                }
                this.connections.push(newConn);
            }
        }

        // Create the org's neural node list
        for (var [number, neuron] of nodeMap) {
            let isDriven = neuron.numInputsFromSensorsOrOtherNeurons != 0;
            this.neurons.push( { output: 0.5, driven: isDriven } );
        }
    }

/********************************************************************************
This function does a neural net feed-forward operation, from sensor (input) neurons
through internal neurons to action (output) neurons. The feed-forward
calculations are evaluated once each simulator step (simStep).

There is no back-propagation in this simulator. Once an individual's neural net
brain is wired at birth, the weights and topology do not change during the
individual's lifetime.

The data structure Indiv::neurons contains internal neurons, and Indiv::connections
holds the connections between the neurons.

We have three types of neurons:

     input sensors - each gives a value in the range SENSOR_MIN.. SENSOR_MAX (0.0..1.0).
         Values are obtained from getSensor().

     internal neurons - each takes inputs from sensors or other internal neurons;
         each has output value in the range NEURON_MIN..NEURON_MAX (-1.0..1.0). The
         output value for each neuron is stored in Indiv::neurons[] and survives from
         one simStep to the next. (For example, a neuron that feeds itself will use
         its output value that was latched from the previous simStep.) Inputs to the
         neurons are summed each simStep in a temporary container and then discarded
         after the neurons' outputs are computed.

     action (output) neurons - each takes inputs from sensors or other internal
         neurons; In this function, each has an output value in an arbitrary range
         (because they are the raw sums of zero or more weighted inputs).
         The values of the action neurons are saved in local container
         actionLevels[] which is returned to the caller by value (thanks RVO).
********************************************************************************/

    feedForward(sensoryData)
    {
        // This container is used to return values for all the action outputs. This array
        // contains one value per action neuron, which is the sum of all its weighted
        // input connections. The sum has an arbitrary range. Return by value assumes compiler
        // return value optimization.
        let actionLevels = new Array(Actions.numActions).fill(0.0);

        // Weighted inputs to each neuron are summed in neuronAccumulators[]
        let neuronAccumulators = new Array(this.neurons.length).fill(0.0);

        // Connections were ordered at birth so that all connections to neurons get
        // processed here before any connections to actions. As soon as we encounter the
        // first connection to an action, we'll pass all the neuron input accumulators
        // through a transfer function and update the neuron outputs in the indiv,
        // except for undriven neurons which act as bias feeds and don't change. The
        // transfer function will leave each neuron's output in the range -1.0..1.0.

        let neuronOutputsComputed = false;
        for (var conn of this.connections) {
            if (conn.sinkType == ACTION && !neuronOutputsComputed) {
                // We've handled all the connections from sensors and now we are about to
                // start on the connections to the action outputs, so now it's time to
                // update and latch all the neuron outputs to their proper range (-1.0..1.0)
                for (let neuronIndex = 0; neuronIndex < this.neurons.length; ++neuronIndex) {
                    if (this.neurons[neuronIndex].driven) {
                        this.neurons[neuronIndex].output = Math.tanh(neuronAccumulators[neuronIndex]);
                    }
                }
                neuronOutputsComputed = true;
            }

            // Obtain the connection's input value from a sensor neuron or other neuron
            // The values are summed for now, later passed through a transfer function
            let inputVal = 0.0;
            if (conn.sourceType == SENSOR) {
                inputVal = sensoryData[conn.sourceNum];
            } else {
                inputVal = this.neurons[conn.sourceNum].output;
            }

            // Weight the connection's value and add to neuron accumulator or action accumulator.
            // The action and neuron accumulators will therefore contain +- float values in
            // an arbitrary range.
            if (conn.sinkType == ACTION) {
                actionLevels[conn.sinkNum] += inputVal * conn.weightAsFloat();
            } else {
                neuronAccumulators[conn.sinkNum] += inputVal * conn.weightAsFloat();
            }
        }
        
        return actionLevels;
    }

    // Convert the indiv's genome to a renumbered connection list
    // This renumbers the neurons from their 16 bit values in the genome
    // to the range 0..p.maxNumberNeurons - 1 by using a modulo operator.
    // Sensors are renumbered 0..Sensor::NUM_SENSES - 1
    // Actions are renumbered 0..Action::NUM_ACTIONS - 1
    makeRenumberedConnectionList() {
        let connectionList = [];
        if (this.numSensorNeurons == 0) return connectionList;
        for (var gene of this.genome.genes) {
            let conn = gene;
            if (conn.sourceType == NEURON) {
                conn.sourceNum %= HyperParams.numNeurons;
            } else {
                conn.sourceNum %= this.numSensorNeurons;
            }

            if (conn.sinkType == NEURON) {
                conn.sinkNum %= HyperParams.numNeurons;
            } else {
                conn.sinkNum %= Actions.numActions;
            }
            connectionList.push(conn);
        }
        return connectionList;
    }

    // Scan the connections and make a list of all the neuron numbers
    // mentioned in the connections. Also keep track of how many inputs and
    // outputs each neuron has.
    // Node object: {remappedNumber, numOutputs, numSelfInputs, numInputsFromSensorsOrOtherNeurons}
    makeNodeList(connectionList) {
        let nodeMap = new Map();
        for (var conn of connectionList) {
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
                            numOutputs: 1, 
                            numSelfInputs: 0, 
                            numInputsFromSensorsOrOtherNeurons: 0
                        });
                }
                
            }
        }
        return nodeMap;
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
                connectionList.splice(i, 1); // Remove element from connectionList
            } else {
                i++;
            }
        }
    }

    // Find and remove neurons that don't feed anything or only feed themself.
    // This reiteratively removes all connections to the useless neurons.
    cullUselessNeurons(connectionList, nodeMap) {
        let allDone = false;
        while (!allDone) {
            allDone = true;
            for (var [number, neuron] of nodeMap.entries()) {
                // We're looking for neurons with zero outputs, or neurons that feed itself
                // and nobody else:
                if (neuron.numOutputs == neuron.numSelfInputs) {  // could be 0
                    allDone = false;
                    // Find and remove connections from sensors or other neurons
                    this.removeConnectionsToNeuron(connectionList, nodeMap, number);
                    nodeMap.delete(number);
                }
            }
        }
    }
}

module.exports = NeuralNet;