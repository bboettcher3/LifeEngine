const Hyperparams = require("../../Hyperparameters");
const Genome = require("./Genome");
const NeuralNet = require("./NeuralNet");

class Brain {
    constructor(owner){
        this.owner = owner;
        this.genome = new Genome();
        this.neuralNet = new NeuralNet(this.genome);
        this.observation = null;
    }

    /* Updates neural net outputs to reflect current actions based on senses */
    /* Returns an array of the action level for each output neuron */
    update(sensoryData) {
        return this.neuralNet.feedForward(sensoryData);
    }

    mutate() {
        // Mutate phenotype

        // Mutate genotype

    }
}

module.exports = Brain;