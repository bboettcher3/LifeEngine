const HashMap = require('hashmap');

class CanvasController{
    constructor(env, canvas) {
        this.env = env;
        this.canvas = canvas;
        this.mouse_x;
        this.mouse_y;
        this.mouse_c;
        this.mouse_r;
        this.left_click = false;
        this.right_click = false;
        this.cur_cells = new HashMap();
        this.cur_org = null;
        this.highlight_org = true;
        this.defineEvents();
    }

    setControlPanel(panel){
        this.control_panel = panel;
    }

    defineEvents() {
        this.canvas.addEventListener('mousemove', e => {
            this.updateMouseLocation(e.offsetX, e.offsetY)
            this.mouseMove();
        });

        this.canvas.addEventListener('mouseup', function(evt) {
            evt.preventDefault();
            this.updateMouseLocation(evt.offsetX, evt.offsetY)
            this.mouseUp();
            this.left_click=false;
            this.right_click=false;
        }.bind(this));

        this.canvas.addEventListener('mousedown', function(evt) {
            evt.preventDefault();
            this.updateMouseLocation(evt.offsetX, evt.offsetY)
            if (evt.button == 0) {
                this.left_click = true;
            }
            if (evt.button == 2) 
                this.right_click = true;
            this.mouseDown();
        }.bind(this));

        this.canvas.addEventListener('contextmenu', function(evt) {
            evt.preventDefault();
        });

        this.canvas.addEventListener('mouseleave', function(){
            this.right_click = false;
            this.left_click = false;
            this.env.renderer.clearAllHighlights(true);
        }.bind(this));

    }

    updateMouseLocation(offsetX, offsetY) {
        var prev_cells = this.cur_cells;
        var prev_org = this.cur_org;

        this.mouse_x = offsetX;
        this.mouse_y = offsetY;
        var colRow = this.env.grid_map.xyToColRow(this.mouse_x, this.mouse_y);
        this.mouse_c = colRow[0];
        this.mouse_r = colRow[1];
        this.cur_cells = this.env.grid_map.cellsAt(this.mouse_c, this.mouse_r);
        if (this.cur_cells.size > 0) {
            this.cur_org = this.cur_cells.values()[0].owner;
        }

        if (this.cur_org != prev_org || this.cur_cells != prev_cells) {
            this.env.renderer.clearAllHighlights(true);
            if (this.cur_org != null && this.highlight_org) {
                this.env.renderer.highlightOrganism(this.cur_org);
            }
            else if (this.cur_cells.size > 0) {
                this.env.renderer.highlightCell(this.cur_cells.values()[0], true);
            }
        }
    }

    mouseMove() {
        alert("mouse move must be overridden");
    }

    mouseDown() {
        alert("mouse down must be overridden");
    }

    mouseUp(){
        alert("mouse up must be overridden")
    }
}

module.exports = CanvasController;