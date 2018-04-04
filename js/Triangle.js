/**
 * The triangle class for the triangulation.
 *
 * Inspired by Delaunay at Travellermap
 *   http://www.travellermap.com/tmp/delaunay.htm
 *
 * @author Ikaros Kappler
 * @date_init 2012-10-17
 * @date 2018-04-03
 * @version 2.0.0
 **/

var EPSILON = 1.0e-6;


//------------------------------------------------------------
// Triangle class
//------------------------------------------------------------
function Triangle( a, b, c )	{
    this.a = a;
    this.b = b;
    this.c = c;

    this.calcCircumcircle();
    
}

// Not in use
Triangle.prototype.getCentroid = function() {
  return new Vertex( (this.a.x + this.b.x + this.c.x)/3,
		     (this.a.y + this.b.y + this.c.y)/3
		   );
};


Triangle.prototype.getCircumcircle = function() {
    if( !this.center || !this.radius ) 
	this.calcCircumcircle();
    return { center : this.center.clone(), radius : this.radius };
};

Triangle.prototype.isAdjacent = function( tri ) {
    var a = this.a.equals(tri.a) || this.a.equals(tri.b) || this.a.equals(tri.c);
    var b = this.b.equals(tri.a) || this.b.equals(tri.b) || this.b.equals(tri.c);
    var c = this.c.equals(tri.a) || this.c.equals(tri.b) || this.c.equals(tri.c);
    return (a&&b) || (a&&c) || (b&&c);
};

Triangle.prototype.calcCircumcircle = function() {
    // From
    //    http://www.exaflop.org/docs/cgafaq/cga1.html

    var A = this.b.x - this.a.x; 
    var B = this.b.y - this.a.y; 
    var C = this.c.x - this.a.x; 
    var D = this.c.y - this.a.y; 

    var E = A*(this.a.x + this.b.x) + B*(this.a.y + this.b.y); 
    var F = C*(this.a.x + this.c.x) + D*(this.a.y + this.c.y); 

    var G = 2.0*(A*(this.c.y - this.b.y)-B*(this.c.x - this.b.x)); 
    
    var dx, dy;
    
    if( Math.abs(G) < EPSILON ) {
	// Collinear - find extremes and use the midpoint		
	var bounds = this.bounds();
	this.center = new Vertex( ( bounds.xMin + bounds.xMax ) / 2, ( bounds.yMin + bounds.yMax ) / 2 );

	dx = this.center.x - bounds.xMin;
	dy = this.center.y - bounds.yMin;
    } else {
	var cx = (D*E - B*F) / G; 
	var cy = (A*F - C*E) / G;

	this.center = new Vertex( cx, cy );

	dx = this.center.x - this.a.x;
	dy = this.center.y - this.a.y;
    }

    this.radius_squared = dx * dx + dy * dy;
    this.radius = Math.sqrt( this.radius_squared );
}; // calcCircumcircle


Triangle.prototype.inCircumcircle = function( v ) {
    var dx = this.center.x - v.x;
    var dy = this.center.y - v.y;
    var dist_squared = dx * dx + dy * dy;

    return ( dist_squared <= this.radius_squared );
    
}; // inCircumcircle



Triangle.prototype.bounds = function() {
    function max3( a, b, c ) { return ( a >= b && a >= c ) ? a : ( b >= a && b >= c ) ? b : c; }
    function min3( a, b, c ) { return ( a <= b && a <= c ) ? a : ( b <= a && b <= c ) ? b : c; }
    var minx = min3( this.a.x, this.b.x, this.c.x );
    var miny = min3( this.a.y, this.b.y, this.c.y );
    var maxx = max3( this.a.x, this.b.x, this.c.x );
    var maxy = max3( this.a.y, this.b.y, this.c.y );
    return { xMin : minx, yMin : miny, xMax : maxx, yMax : maxy, width : maxx-minx, height : maxy-miny };
};

Triangle.prototype.containsPoint = function( p ) {
    //
    // Point-in-Triangle test found at
    //   http://stackoverflow.com/questions/2049582/how-to-determine-a-point-in-a-2d-triangle
    //
    function pointIsInTriangle( px, py, p0x, p0y, p1x, p1y, p2x, p2y ) {
	
	var area = 1/2*(-p1y*p2x + p0y*(-p1x + p2x) + p0x*(p1y - p2y) + p1x*p2y);

	var s = 1/(2*area)*(p0y*p2x - p0x*p2y + (p2y - p0y)*px + (p0x - p2x)*py);
	var t = 1/(2*area)*(p0x*p1y - p0y*p1x + (p0y - p1y)*px + (p1x - p0x)*py);

	return s > 0 && t > 0 && (1-s-t) > 0;
    };

    return pointIsInTriangle( p.x, p.y, this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y );
};

Triangle.prototype.toString = function() {
    return '{ a : ' + this.a.toString () + ', b : ' + this.b.toString() + ', c : ' + this.c.toString() + '}';
};
// END Triangle
