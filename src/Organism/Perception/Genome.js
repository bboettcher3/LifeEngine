const Gene = require("./Gene");
const HyperParams = require("../../Hyperparameters");

class Genome {
    constructor(genes=null){
        if (genes != null) {
            this.genes = genes;
        } else {
            this.genes = [];
            for (let i = 0; i < HyperParams.numGenes; i++) {
                this.genes.push(new Gene());
            }
        }
    }

    // Create hex string from genome
    print() {
        console.log("genome start --");
        for (var gene of this.genes) {
            gene.print();
        }
        console.log("genome end   --");
    }
}

module.exports = Genome;