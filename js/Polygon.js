/**
 * A polygon class.
 *
 * @requires Vertex
 * 
 * @author Ikaros Kappler
 * @date   2018-04-14
 * @version 1.0.0
 **/

(function(_context) {

    // +---------------------------------------------------------------------------------
    // | The constructor.
    // |
    // | @param vertices Array:Vertex An array of 2d vertices that shape the polygon
    // +-------------------------------
    _context.Polygon = function( vertices, isOpen ) {
	if( typeof vertices == 'undefined' )
	    vertices = [];
	this.vertices = vertices;
	this.isOpen = isOpen;
    };


    // +---------------------------------------------------------------------------------
    // | Convert this polygon to a sequence of quadratic bezier curves.
    // |
    // | The first vertex in the returned array is the start point.
    // | The following sequence are pairs of control-point-and-end-point:
    // | startPoint, controlPoint0, pathPoint1, controlPoint1, pathPoint2, controlPoint2, ..., endPoint  
    // |
    // | @param vertices Array:Vertex An array of 2d vertices that shape the polygon
    // +-------------------------------
    _context.Polygon.prototype.toQuadraticBezierData = function() {
	if( this.vertices.length < 3 )
	    return [];
	var qbezier = [];
	var cc0 = this.vertices[0]; // cell.triangles[0].getCircumcircle().center;
	var cc1 = this.vertcies[1]; // cell.triangles[1].getCircumcircle().center;
	var edgeCenter = new Vertex( cc0.x + (cc1.x-cc0.x)/2,
				     cc0.y + (cc1.y-cc0.y)/2 );
	qbezier.push( edgeCenter );
	var limit = this.isOpen ? vertices.length+1 : vertices.length;
	for( var t = 1; t <= limit; t++ ) {	    
	    cc0 = cell.triangles[ t%this.vertices.length ]; // .getCircumcircle().center;
	    cc1 = cell.triangles[ (t+1)%this.vertices.length ]; // .getCircumcircle().center;
	    var edgeCenter = new Vertex( cc0.x + (cc1.x-cc0.x)/2,
					 cc0.y + (cc1.y-cc0.y)/2 );
	    qbezier.push( cc0 );
	    qbezier.push( edgeCenter );
	    cc0 = cc1;
	}
	return qbezier;
    };
    
})(window ? window : module.export );
