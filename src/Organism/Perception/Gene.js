const Hyperparams = require("../Hyperparameters");

const NeuronType = {
    internal: 0,
    sensor: 1,
    action: 1
}

class Gene {
    constructor(){
        /* All members are stored 16 bit integers */
        /* Random values to start */
        this.sourceType = getRandomInt(1);
        this.sourceNum = getRandomInt(0x7FFF) % HyperParams.numNeurons;
        this.sinkType = getRandomInt(1);
        this.sinkNum = getRandomInt(0x7FFF) % HyperParams.numNeurons;
        this.weight = Math.Round(Math.random() * 0xEFFF) - 0x8000;
    }

    weightAsFloat(){ return weight / 8192.0; }
    /* Random int from 0 to max (inclusive) */
    getRandomInt(max){ return Math.floor(Math.random() * (max + 1)); }
}

module.exports = Gene;