const Gene = require("./Gene");
const Hyperparams = require("../../Hyperparameters");

class Genome {
    constructor(){
        this.genes = [];
        for (let i = 0; i < HyperParams.numGenes; i++) {
            this.genes.push(new Gene());
        }
    }

}

module.exports = Genome;