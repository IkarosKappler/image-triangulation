/**
 * The vertex class for point set.
 *
 * @author    Ikaros Kappler
 * @date_init 2012-10-17
 * @date      2018-04-03
 * @version   2.0.0
 **/

var EPSILON = 1.0e-6;


//------------------------------------------------------------
// Vertex class
//------------------------------------------------------------
var Vertex = function( x, y ) {
    this.x = x;
    this.y = y;
};

Vertex.prototype.equals = function( vertex ) {
    var eqX =  (Math.abs(this.x-vertex.x) < EPSILON);
    var eqY =  (Math.abs(this.y-vertex.y) < EPSILON);
    var result = eqX && eqY;
    return result;
};
Vertex.prototype.clone = function() {
    return new Vertex(this.x,this.y);
};	    
Vertex.prototype.scale = function( factor, center ) {
    if( !center || typeof center === "undefined" )
	center = new Vertex(0,0);
    this.x = center.x + (this.x-center.x)*factor;
    this.y = center.y + (this.y-center.y)*factor;
    return this;
};
Vertex.prototype.toString = function() {
    return '('+this.x+','+this.y+')';
};
// END Vertex

