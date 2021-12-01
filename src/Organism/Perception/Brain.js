const Hyperparams = require("../../Hyperparameters");
const Directions = require("../Directions");
const CellStates = require("../Cell/CellStates");
const Genome = require("./Genome");
const NeuralNet = require("./NeuralNet");

class Brain {
    constructor(owner){
        this.owner = owner;
        this.genome = new Genome();
        this.neuralNet = new NeuralNet(this.genome);
        this.observation = null;
    }

    observe(observation) {
        this.observation = observation;
    }

    /* Updates neural net outputs to reflect current actions based on senses */
    update() {
        if (this.observation == null) return;
        if (this.observation.cell == null || this.observation.cell.owner == this.owner) {
            return;
        }
        /* TODO: run neural net based on current sense inputs */
        this.observation = null;
    }

    mutate() {
        // Mutate phenotype

        // Mutate genotype

    }
}

module.exports = Brain;