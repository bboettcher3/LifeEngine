const CellStates = require("./Cell/CellStates");
const Neighbors = require("../Grid/Neighbors");
const Hyperparams = require("../Hyperparameters");
const Directions = require("./Directions");
const Anatomy = require("./Anatomy");
const Brain = require("./Perception/Brain");
const Sensors = require("./Perception/Sensors");
const Actions = require("./Perception/Actions");
const FossilRecord = require("../Stats/FossilRecord");

class Organism {
    constructor(col, row, env, parent=null) {
        this.c = col;
        this.r = row;
        this.env = env;
        this.lifetime = 0;
        this.food_collected = 0;
        this.living = true;
        this.anatomy = new Anatomy(this);
        this.brain = new Brain(this);
        this.direction = Directions.down; // direction of movement
        this.rotation = Directions.up; // direction of rotation
        this.can_rotate = Hyperparams.moversCanRotate;
        this.move_count = 0;
        this.move_range = 4;
        this.ignore_brain_for = 0;
        this.mutability = 5;
        this.damage = 0;
        
        if (parent != null) {
            this.inherit(parent);
        }
    }

    inherit(parent) {
        this.move_range = parent.move_range;
        this.mutability = parent.mutability;
        this.species = parent.species;
        // this.birth_distance = parent.birth_distance;
        for (var c of parent.anatomy.cells){
            //deep copy parent cells
            this.anatomy.addInheritCell(c);
        }
        if(parent.anatomy.is_mover) {
            for (var i in parent.brain.decisions) {
                this.brain.decisions[i] = parent.brain.decisions[i];
            }
        }
    }

    // amount of food required before it can reproduce
    foodNeeded() {
        return this.anatomy.cells.length;
    }

    lifespan() {
        // console.log(Hyperparams.lifespanMultiplier)
        return this.anatomy.cells.length * Hyperparams.lifespanMultiplier;
    }

    maxHealth() {
        return this.anatomy.cells.length;
    }

    reproduce() {
        //produce mutated child
        //check nearby locations (is there room and a direct path)
        var org = new Organism(0, 0, this.env, this);
        if(Hyperparams.offspringRotate){
            org.rotation = Directions.getRandomDirection();
        }
        var prob = this.mutability;
        if (Hyperparams.useGlobalMutability){
            prob = Hyperparams.globalMutability;
        }
        else {
            //mutate the mutability
            if (Math.random() <= 0.5)
                org.mutability++;
            else{ 
                org.mutability--;
                if (org.mutability < 1)
                    org.mutability = 1;
            }
        } 
        var mutated = false;
        if (Math.random() * 100 <= prob) {
            if (org.anatomy.is_mover && Math.random() * 100 <= 10) { 
                if (org.anatomy.has_eyes) {
                    org.brain.mutate();
                }
                org.move_range += Math.floor(Math.random() * 4) - 2;
                if (org.move_range <= 0){
                    org.move_range = 1;
                };
                
            }
            else {
                mutated = org.mutate();
            }
        }

        var direction = Directions.getRandomScalar();
        var direction_c = direction[0];
        var direction_r = direction[1];
        var offset = (Math.floor(Math.random() * 3));
        var basemovement = this.anatomy.birth_distance;
        var new_c = this.c + (direction_c*basemovement) + (direction_c*offset);
        var new_r = this.r + (direction_r*basemovement) + (direction_r*offset);

        // console.log(org.isClear(new_c, new_r, org.rotation, true))
        if (org.isClear(new_c, new_r, org.rotation, true) && org.isStraightPath(new_c, new_r, this.c, this.r, this)){
            org.c = new_c;
            org.r = new_r;
            this.env.addOrganism(org);
            org.updateGrid();
            if (mutated) {
                FossilRecord.addSpecies(org, this.species);
            }
            else {
                org.species.addPop();
            }
        }
        this.food_collected -= this.foodNeeded();

    }

    mutate() {
        let mutated = false;
        if (this.calcRandomChance(Hyperparams.addProb)) {
            let branch = this.anatomy.getRandomCell();
            let state = CellStates.getRandomLivingType();//branch.state;
            let growth_direction = Neighbors.all[Math.floor(Math.random() * Neighbors.all.length)]
            let c = branch.loc_col+growth_direction[0];
            let r = branch.loc_row+growth_direction[1];
            if (this.anatomy.canAddCellAt(c, r)){
                mutated = true;
                this.anatomy.addRandomizedCell(state, c, r);
            }
        }
        if (this.calcRandomChance(Hyperparams.changeProb)){
            let cell = this.anatomy.getRandomCell();
            let state = CellStates.getRandomLivingType();
            this.anatomy.replaceCell(state, cell.loc_col, cell.loc_row);
            mutated = true;
        }
        if (this.calcRandomChance(Hyperparams.removeProb)){
            if(this.anatomy.cells.length > 1) {
                let cell = this.anatomy.getRandomCell();
                mutated = this.anatomy.removeCell(cell.loc_col, cell.loc_row);
            }
        }
        return mutated;
    }

    calcRandomChance(prob) {
        return (Math.random() * 100) < prob;
    }

    attemptMove(offsetX, offsetY) {
        var new_c = this.c + offsetX;
        var new_r = this.r + offsetY;
        if (this.isClear(new_c, new_r)) {
            for (var cell of this.anatomy.cells) {
                var real_c = this.c + cell.rotatedCol(this.rotation);
                var real_r = this.r + cell.rotatedRow(this.rotation);
                this.env.changeCell(real_c, real_r, CellStates.empty, null);
            }
            this.c = new_c;
            this.r = new_r;
            this.updateGrid();
            return true;
        }
        return false;
    }

    attemptRotate() {
        if(!this.can_rotate){
            this.direction = Directions.getRandomDirection();
            this.move_count = 0;
            return true;
        }
        var new_rotation = Directions.getRandomDirection();
        if(this.isClear(this.c, this.r, new_rotation)){
            for (var cell of this.anatomy.cells) {
                var real_c = this.c + cell.rotatedCol(this.rotation);
                var real_r = this.r + cell.rotatedRow(this.rotation);
                this.env.changeCell(real_c, real_r, CellStates.empty, null);
            }
            this.rotation = new_rotation;
            this.direction = Directions.getRandomDirection();
            this.updateGrid();
            this.move_count = 0;
            return true;
        }
        return false;
    }

    changeDirection(dir) {
        this.direction = dir;
        this.move_count = 0;
    }

    // assumes either c1==c2 or r1==r2, returns true if there is a clear path from point 1 to 2
    isStraightPath(c1, r1, c2, r2, parent){
        if (c1 == c2) {
            if (r1 > r2){
                var temp = r2;
                r2 = r1;
                r1 = temp;
            }
            for (var i=r1; i!=r2; i++) {
                var cell = this.env.grid_map.cellAt(c1, i)
                if (!this.isPassableCell(cell, parent)){
                    return false;
                }
            }
            return true;
        }
        else {
            if (c1 > c2){
                var temp = c2;
                c2 = c1;
                c1 = temp;
            }
            for (var i=c1; i!=c2; i++) {
                var cell = this.env.grid_map.cellAt(i, r1);
                if (!this.isPassableCell(cell, parent)){
                    return false;
                }
            }
            return true;
        }
    }

    isPassableCell(cell, parent){
        return cell != null && (cell.state == CellStates.empty || cell.owner == this || cell.owner == parent || cell.state == CellStates.food);
    }

    isClear(col, row, rotation=this.rotation, ignore_armor=false) {
        for(var loccell of this.anatomy.cells) {
            var cell = this.getRealCell(loccell, col, row, rotation);
            if (cell==null) {
                return false;
            }
            // console.log(cell.owner == this)
            if (cell.owner==this || cell.state==CellStates.empty || (!Hyperparams.foodBlocksReproduction && cell.state==CellStates.food) || (ignore_armor && loccell.state==CellStates.armor && cell.state==CellStates.food)){
                continue;
            }
            return false;
        }
        return true;
    }

    harm() {
        this.damage++;
        if (this.damage >= this.maxHealth() || Hyperparams.instaKill) {
            this.die();
        }
    }

    die() {
        for (var cell of this.anatomy.cells) {
            var real_c = this.c + cell.rotatedCol(this.rotation);
            var real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, CellStates.food, null);
        }
        this.species.decreasePop();
        this.living = false;
    }

    updateGrid() {
        for (var cell of this.anatomy.cells) {
            var real_c = this.c + cell.rotatedCol(this.rotation);
            var real_r = this.r + cell.rotatedRow(this.rotation);
            this.env.changeCell(real_c, real_r, cell.state, cell);
        }
    }

    update() {
        this.lifetime++;
        if (this.lifetime > this.lifespan()) {
            this.die();
            return this.living;
        }
        if (this.food_collected >= this.foodNeeded()) {
            this.reproduce();
        }
        for (var cell of this.anatomy.cells) {
            cell.performFunction();
            if (!this.living)
                return this.living;
        }
        
        // Retrieve sensory data from surroundings
        let sensoryData = this.getSensoryData();
        // Get action output levels from brain
        let actionLevels = this.brain.update(sensoryData);
        // Execute actions over their respective threshold
        this.executeActions(actionLevels);

        return this.living;
    }

    // Returns an array of scaled sensory values between 0.0 and 1.0 (in order from Sensors.all)
    getSensoryData() {
        var sensorValues = new Array(Sensors.numSensors).fill(0.0);
        var sensorTypes = Sensors.all;
        for (let i = 0; i < Sensors.numSensors; ++i) {
            switch (sensorTypes[i]) {
                case Sensors.locX:
                    sensorValues[i] = this.r / this.env.grid_map.rows;
                    break;
                case Sensors.locY:
                    sensorValues[i] = this.c / this.env.grid_map.cols;
                    break;
            }
        }
        return sensorValues;
    }

    // Given a factor in the range 0.0..1.0, return a bool with the
    // probability of it being true proportional to factor. For example, if
    // factor == 0.2, then there is a 20% chance this function will
    // return true.
    prob2bool(factor)
    {
        return Math.random() < factor;
    }

    executeActions(actionLevels) {
        // ------------- Movement action neurons ---------------
        // There are multiple action neurons for movement. Each type of movement neuron
        // urges the individual to move in some specific direction. We sum up all the
        // X and Y components of all the movement urges, then pass the X and Y sums through
        // a transfer function (tanh()) to get a range -1.0..1.0. The absolute values of the
        // X and Y values are passed through prob2bool() to convert to -1, 0, or 1, then
        // multiplied by the component's signum. This results in the x and y components of
        // a normalized movement offset. I.e., the probability of movement in either
        // dimension is the absolute value of tanh of the action level X,Y components and
        // the direction is the sign of the X, Y components. For example, for a particular
        // action neuron:
        //     X, Y == -5.9, +0.3 as raw action levels received here
        //     X, Y == -0.999, +0.29 after passing raw values through tanh()
        //     Xprob, Yprob == 99.9%, 29% probability of X and Y becoming 1 (or -1)
        //     X, Y == -1, 0 after applying the sign and probability
        //     The agent will then be moved West (an offset of -1, 0) if it's a legal move.

        // moveX,moveY will be the accumulators that will hold the sum of all the
        // urges to move along each axis. (+- floating values of arbitrary range)
        let moveX = actionLevels[Actions.moveX];
        let moveY = actionLevels[Actions.moveY];

        let level = actionLevels[Actions.moveRandom];
        let offset = Directions.getRandomScalar();
        moveX += offset[0] * level;
        moveY += offset[1] * level;

        // Convert the accumulated X, Y sums to the range -1.0..1.0
        moveX = Math.tanh(moveX);
        moveY = Math.tanh(moveY);

        // The probability of movement along each axis is the absolute value
        let probX = this.prob2bool(Math.abs(moveX)); // convert abs(level) to 0 or 1
        let probY = this.prob2bool(Math.abs(moveY)); // convert abs(level) to 0 or 1

        // The direction of movement (if any) along each axis is the sign
        let signumX = moveX < 0.0 ? -1 : 1;
        let signumY = moveY < 0.0 ? -1 : 1;

        // Generate a normalized movement offset, where each component is -1, 0, or 1
        // Move there if it's a valid location
        this.attemptMove(probX * signumX, probY * signumY);
    }

    getRealCell(local_cell, c=this.c, r=this.r, rotation=this.rotation){
        var real_c = c + local_cell.rotatedCol(rotation);
        var real_r = r + local_cell.rotatedRow(rotation);
        return this.env.grid_map.cellAt(real_c, real_r);
    }

}

module.exports = Organism;
