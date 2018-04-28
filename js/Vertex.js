/**
 * The vertex class for point set.
 *
 * @author    Ikaros Kappler
 * @date_init 2012-10-17
 * @date      2018-04-03
 * @modified  2018-04-28 Added some documentation.
 * @version   2.0.1
 **/


(function(_context) {

    // An epsilon for comparison
    var EPSILON = 1.0e-6;


    // +------------------------------------------------------------
    // | Vertex class
    // +------------------------------------------------------------
    var Vertex = _context.Vertex = function( x, y ) {
	this.x = x;
	this.y = y;
    };


    // +------------------------------------------------------------
    // | Check if this vertex equals the passed one.
    // |
    // | This function uses the epsilon as tolerance.
    // |
    // | @param vertex:Vertex The vertex to compare this with.
    // |
    // | @return boolean
    // +-------------------------------------------------------
    Vertex.prototype.equals = function( vertex ) {
	var eqX =  (Math.abs(this.x-vertex.x) < EPSILON);
	var eqY =  (Math.abs(this.y-vertex.y) < EPSILON);
	var result = eqX && eqY;
	return result;
    };


    
    // +------------------------------------------------------------
    // | Create a copy of this vertex.
    // |
    // | @return Vertex
    // +-------------------------------------------------------
    Vertex.prototype.clone = function() {
	return new Vertex(this.x,this.y);
    };


    // +------------------------------------------------------------
    // | This is a vector-like behavior and 'scales' this vertex
    // | towards/from a given center.
    // |
    // | @param factor:float The scale factor; 1.0 means no change.
    // | @param center:Vertex The origin of scaling; default is (0,0).
    // |
    // | @return Vertex This vector for chaining.
    // +-------------------------------------------------------
    Vertex.prototype.scale = function( factor, center ) {
	if( !center || typeof center === "undefined" )
	    center = new Vertex(0,0);
	this.x = center.x + (this.x-center.x)*factor;
	this.y = center.y + (this.y-center.y)*factor;
	return this;
    };


    // +------------------------------------------------------------
    // | Convert this vertex into a human-readable format.
    // |
    // | @return string
    // +-------------------------------------------------------
    Vertex.prototype.toString = function() {
	return '('+this.x+','+this.y+')';
    };
    // END Vertex

})( window ? window : module.exports );
