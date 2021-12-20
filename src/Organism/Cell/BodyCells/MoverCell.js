const CellStates = require("../CellStates");
const BodyCell = require("./BodyCell");
const Directions = require("../../Directions");

class MoverCell extends BodyCell{
    constructor(org, loc_col, loc_row){
        super(CellStates.mover, org, loc_col, loc_row);
        this.org.anatomy.is_mover = true;
    }
}

module.exports = MoverCell;