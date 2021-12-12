// A cell state is used to differentiate type and render the cell
class Action {
    constructor(name) {
        this.name = name;
    }

//    render(ctx, cell, size) {
//      ctx.fillStyle = this.color;
//        ctx.fillRect(cell.x, cell.y, size, size);
//    }
}

const Actions = {
    moveX: 0, // +- x component of movement ()
    moveY: 1, // +- y component of movement
    moveRandom: 2, // Move in a random direction (moveX and moveY have priority when firing at the same time though)
    killNeighbors: 3, // Probability of killing all organisms touching its killer cells
    defineLists() {
        this.all = [this.moveX, this.moveY, this.moveRandom, this.killNeighbors];
        this.numActions = all.length;
    },
    // TODO: remove after makign functions
    //getSomething: function() {
    //    return this.all[Math.floor(Math.random() * this.all.length)].name;
    //},
}
Actions.defineLists();

module.exports = Actions;
