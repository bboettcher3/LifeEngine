const HyperParams = require("../../Hyperparameters");
const Genome = require("./Genome");
const NeuralNet = require("./NeuralNet");

class Brain {
    constructor(owner, parent){
        this.owner = owner;
        let genes = (parent != null) ? parent.brain.genome.genes : null;
        this.genome = new Genome(genes);
        this.neuralNet = new NeuralNet(this.genome);
        this.observation = null;
    }

    /* Updates neural net outputs to reflect current actions based on senses */
    /* Returns an array of the action level for each output neuron */
    update(sensoryData) {
        return this.neuralNet.feedForward(sensoryData);
    }

    // Performs bit flips to genes conditionally from the mutation probability
    // Returns true if any genes were mutated
    mutate() {
        for (var gene of this.genome.genes) {
            if (Math.random() < HyperParams.genomeMutationProb) {
                this.randomBitFlip(gene);
            }
        }
    }

    // This applies a point mutation at a random bit in a gene.
    randomBitFlip(gene)
    {
        let bitMask = 1 << Math.floor(Math.random() * 16);
        let chance = Math.random(); // 0..1
        if (chance < 0.2) { // sourceType
            gene.sourceType ^= 1;
        } else if (chance < 0.4) { // sinkType
            gene.sinkType ^= 1;
        } else if (chance < 0.6) { // sourceNum
            gene.sourceNum ^= bitMask;
        } else if (chance < 0.8) { // sinkNum
            gene.sinkNum ^= bitMask;
        } else { // weight
            gene.weight ^= bitMask;
        }
    }
}

module.exports = Brain;