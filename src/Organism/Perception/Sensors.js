// A cell state is used to differentiate type and render the cell
class Sensor {
    constructor() {
    }

//    render(ctx, cell, size) {
//      ctx.fillStyle = this.color;
//        ctx.fillRect(cell.x, cell.y, size, size);
//    }
}

/*class Sight extends Sensor {
    constructor() {
        super('sight');
    }
} */

const Sensors = {
    locX: 0, // From 0-1 depending on boundaries
    locY: 1, // ^
    defineLists() {
        this.all = [this.locX, this.locY, this.boundaryDistX, this.boundaryDistY];
        this.numSensors = this.all.length;
    },
    // TODO: remove after makign functions
    //getSomething: function() {
    //    return this.all[Math.floor(Math.random() * this.all.length)].name;
    //},
}
Sensors.defineLists();

module.exports = Sensors;
