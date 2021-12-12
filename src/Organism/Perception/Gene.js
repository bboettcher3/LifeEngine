const HyperParams = require("../../Hyperparameters");

const NeuronType = {
    internal: 0,
    sensor: 1,
    action: 1
}



class Gene {
    constructor(){
        /* All members are stored 16 bit integers */
        /* Random values to start */
        this.sourceType = this.getRandomInt(1);
        this.sourceNum = this.getRandomInt(0x7FFF) % HyperParams.numNeurons;
        this.sinkType = this.getRandomInt(1);
        this.sinkNum = this.getRandomInt(0x7FFF) % HyperParams.numNeurons;
        this.weight = Math.round(Math.random() * 0xFFFF) - 0x8000;
        this.numBits = 98; // 1 sourceType, 1 sinkType
    }

    weightAsFloat(){ return this.weight / 8192.0; }
    /* Random int from 0 to max (inclusive) */
    getRandomInt(max){ return Math.floor(Math.random() * (max + 1)); }

    // Create hex string from gene
    // Gene structure: sourceType | sourceNum | sinkType | sinkNum | weight
    // Field sizes:    1 bit      | 2 bytes   | 1 bit    | 2 bytes | 2 bytes
    print() {
        let geneString = "".concat(
            this.sourceType.toString(16), "|",
            this.sourceNum.toString(16), "|",
            this.sinkType.toString(16), "|",
            this.sinkNum.toString(16), "|",
            this.weight.toString(16)
            );
        console.log(geneString);
    }
}

module.exports = Gene;