const CellStates = require("./Cell/CellStates");
const BodyCellFactory = require("./Cell/BodyCells/BodyCellFactory");

class Anatomy {
    constructor(owner) {
        this.owner = owner;
        this.cells = []; // main cells (left side)
        this.mirrorCells = []; // bilateral symmetry cells (right side)
        this.is_producer = false;
        this.is_mover = false;
        this.has_eyes = false;
        this.birth_distance = 4;
    }

    canAddCellAt(c, r) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return false;
            }
        }
        for (var cell of this.mirrorCells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return false;
            }
        }
        return true;
    }

    getMirroredCell(cell) {
        var i = this.cells.indexOf(cell);
        if (i == -1) {
            i = this.mirrorCells.indexOf(cell);
            return this.cells[i];
        }
        return this.mirrorCells[i];
    }

    isMirrorSide(c, r) {
        // column/row: 0th bit == 0, >/<: xor with itself == 0
        // some logic manipulation of the Directions values
        var checkRow = this.owner.rotation & 1;
        var checkGreater = this.owner.rotation ^ this.owner.rotation;
        return checkRow ? (checkGreater ? r > this.owner.r : r < this.owner.r) :
                           checkGreater ? c > this.owner.c : c < this.owner.c;
    }

    addDefaultCell(state, c, r) {
        var new_cell = BodyCellFactory.createDefault(this.owner, state, c, r);
        var mirrorLoc = new_cell.mirroredLoc();
        var new_mirror_cell = BodyCellFactory.createDefault(this.owner, state, mirrorLoc[0], mirrorLoc[1]);
        if (this.isMirrorSide(c, r)) {
            this.cells.push(new_mirror_cell);
            this.mirrorCells.push(new_cell);
        } else {
            this.cells.push(new_cell);
            this.mirrorCells.push(new_mirror_cell);
        }
        return new_cell;
    }

    addRandomizedCell(state, c, r) {
        if (state==CellStates.eye && !this.has_eyes) {
            this.owner.brain.randomizeDecisions();
        }
        var new_cell = BodyCellFactory.createRandom(this.owner, state, c, r);
        var mirrorLoc = new_cell.mirroredLoc();
        var new_mirror_cell = BodyCellFactory.createRandom(this.owner, state, mirrorLoc[0], mirrorLoc[1]);
        if (this.isMirrorSide(c, r)) {
            this.cells.push(new_mirror_cell);
            this.mirrorCells.push(new_cell);
        } else {
            this.cells.push(new_cell);
            this.mirrorCells.push(new_mirror_cell);
        }
        return new_cell;
    }

    addInheritCell(parent_cell) {
        var new_cell = BodyCellFactory.createInherited(this.owner, parent_cell);
        var mirrorLoc = new_cell.mirroredLoc();
        var new_mirror_cell = BodyCellFactory.createInherited(this.owner, parent_cell);
        new_mirror_cell.loc_col = mirrorLoc[0]; // overwrite position from parent
        new_mirror_cell.loc_row = mirrorLoc[1];
        if (this.isMirrorSide(new_cell.loc_col, new_cell.loc_row)) {
            this.cells.push(new_mirror_cell);
            this.mirrorCells.push(new_cell);
        } else {
            this.cells.push(new_cell);
            this.mirrorCells.push(new_mirror_cell);
        }
        return new_cell;
    }

    replaceCell(state, c, r, randomize=true) {
        this.removeCell(c, r, true);
        if (randomize) {
            return this.addRandomizedCell(state, c, r);
        }
        else {
            return this.addDefaultCell(state, c, r);
        }
    }

    removeCell(c, r, allow_center_removal=false) {
        if (c == 0 && r == 0 && !allow_center_removal)
            return false;
        for (var i=0; i<this.cells.length; i++) {
            var cell = this.cells[i];
            if (cell.loc_col == c && cell.loc_row == r){
                this.cells.splice(i, 1);
                this.mirrorCells.splice(i, 1);
                break;
            }
        }
        for (var i=0; i<this.mirrorCells.length; i++) {
            var cell = this.cells[i];
            if (cell.loc_col == c && cell.loc_row == r){
                this.cells.splice(i, 1);
                this.mirrorCells.splice(i, 1);
                break;
            }
        }
        this.checkTypeChange(cell.state);
        return true;
    }

    getLocalCell(c, r) {
        for (var cell of this.cells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return cell;
            }
        }
        for (var cell of this.mirrorCells) {
            if (cell.loc_col == c && cell.loc_row == r){
                return cell;
            }
        }
        return null;
    }

    checkTypeChange() {
        this.is_producer = false;
        this.is_mover = false;
        this.has_eyes = false;
        for (var cell of this.cells) {
            if (cell.state == CellStates.producer)
                this.is_producer = true;
            if (cell.state == CellStates.mover)
                this.is_mover = true;
            if (cell.state == CellStates.eye)
                this.has_eyes = true;
        }
    }

    getRandomCell() {
        return this.cells[Math.floor(Math.random() * this.cells.length)];
    }

    getNeighborsOfCell(col, row) {

        var neighbors = [];

        for (var x = -1; x <= 1; x++) {
            for (var y = -1; y <= 1; y++) {

                var neighbor = this.getLocalCell(col + x, row + y);
                if (neighbor)
                    neighbors.push(neighbor)
            }
        }

        return neighbors;
    }
}

module.exports = Anatomy;