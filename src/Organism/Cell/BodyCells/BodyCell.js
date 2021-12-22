const CellStates = require("../CellStates");
const Directions = require("../../Directions");

// A body cell defines the relative location of the cell in it's parent organism. It also defines their functional behavior.
class BodyCell{
    constructor(state, org, loc_col, loc_row){
        this.state = state;
        this.org = org;
        this.loc_col = loc_col;
        this.loc_row = loc_row;

        var distance = Math.max(Math.abs(loc_row)*2 + 2, Math.abs(loc_col)*2 + 2);
        if (this.org.anatomy.birth_distance < distance) {
            this.org.anatomy.birth_distance = distance;
        }
    }

    initInherit(parent) {
        // deep copy parent values
        this.loc_col = parent.loc_col;
        this.loc_row = parent.loc_row;
    }
    
    initRandom() {
        // initialize values randomly
    }

    initDefault() {
        // initialize to default values 
    }

    performFunction(env) {
        // default behavior: none
    }


    getRealCol() {
        return this.org.c + this.rotatedCol(this.org.rotation);
    }
    
    getRealRow() {
        return this.org.r + this.rotatedRow(this.org.rotation);
    }

    getRealCell() {
        var real_c = this.getRealCol();
        var real_r = this.getRealRow();
        return this.org.env.grid_map.cellAt(real_c, real_r);
    }

    rotatedCol(dir){
        switch(dir){
            case Directions.up:
                return this.loc_col;
            case Directions.down:
                return this.loc_col * -1;
            case Directions.left:
                return this.loc_row;
            case Directions.right:
                return this.loc_row * -1;
        }
    }

    rotatedRow(dir){
        switch(dir){
            case Directions.up:
                return this.loc_row;
            case Directions.down:
                return this.loc_row * -1;
            case Directions.left:
                return this.loc_col * -1;
            case Directions.right:
                return this.loc_col;
        }
    }

    // mirrored around [0, 0] vertically with 0 x being part of the left side
    // l l     r
    // l (0,0) r
    // l l     r
    mirroredLoc(){
        switch(this.org.rotation){
            case Directions.up:
                return [this.loc_col * -1 + 1, this.loc_row];
            case Directions.down:
                return [this.loc_col * -1 - 1, this.loc_row];
            case Directions.left:
                return [this.loc_col, this.loc_row * -1 - 1];
            case Directions.right:
                return [this.loc_col, this.loc_row * -1 + 1];
        }
        return [0, 0];
    }
}

module.exports = BodyCell;
