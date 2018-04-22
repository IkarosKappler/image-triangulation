/**
 * Moved some draw functions to this wrapper.
 *
 * @require Vertex
 *
 * @author Ikaros Kappler
 * @date   2018-04-22
 * @version 1.0.0
 **/

(function(_context) {
    "use strict";
    
    _context.drawutils = function( context ) {
	this.ctx = context;
	this.offset = new Vertex(0,0); 
    };

    // +---------------------------------------------------------------------------------
    // | Draw the given line (between the two points) with the specified (CSS-) color.
    // +-------------------------------
    // CURRENTLY NOT IN USE
    /*_context.drawutils.prototype.drawLine = function( zA, zB, color ) {
	    this.ctx.beginPath();
	    this.ctx.moveTo( this.offset.x+zA.x, this.offset.y+zA.y );
	    this.ctx.lineTo( this.offset.x+zB.x, this.offset.y+zB.y );
	    this.ctx.strokeStyle = color;
	    this.ctx.lineWidth = 1;
	    this.ctx.stroke();
    };
    */

    
    // +---------------------------------------------------------------------------------
    // | Draw the given point with the specified (CSS-) color.
    // +-------------------------------
    _context.drawutils.prototype.point = function( p, color ) {
	var radius = 3;
	this.ctx.beginPath();
	this.ctx.arc( p.x, p.y, radius, 0, 2 * Math.PI, false );
	this.ctx.fillStyle = color;
	this.ctx.fill();
    };
    
})(window ? window : module.export );
