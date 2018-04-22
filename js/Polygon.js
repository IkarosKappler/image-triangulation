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
    // | @param vertices:Array[Vertex] An array of 2d vertices that shape the polygon
    // +-------------------------------
    _context.Polygon.prototype.toQuadraticBezierData = function() {
	if( this.vertices.length < 3 )
	    return [];
	var qbezier = [];
	var cc0 = this.vertices[0]; 
	var cc1 = this.vertices[1]; 
	var edgeCenter = new Vertex( cc0.x + (cc1.x-cc0.x)/2,
				     cc0.y + (cc1.y-cc0.y)/2 );
	qbezier.push( edgeCenter );
	var limit = this.isOpen ? this.vertices.length : this.vertices.length+1;
	for( var t = 1; t < limit; t++ ) {  
	    cc0 = this.vertices[ t%this.vertices.length ];
	    cc1 = this.vertices[ (t+1)%this.vertices.length ];
	    var edgeCenter = new Vertex( cc0.x + (cc1.x-cc0.x)/2,
					 cc0.y + (cc1.y-cc0.y)/2 );
	    qbezier.push( cc0 );
	    qbezier.push( edgeCenter );
	    cc0 = cc1;
	}
	return qbezier;
    };

    // +---------------------------------------------------------------------------------
    // | Convert this polygon to a quadratic bezier curve, represented as an SVG data string
    // |
    // | @return svgData:string
    // +-------------------------------
    _context.Polygon.prototype.toQuadraticBezierSVGString = function() {
	var qdata = this.toQuadraticBezierData();
	if( qdata.length == 0 )
	    return "";
	var buffer = [ 'M ' + qdata[0].x+' '+qdata[0].y ];
	for( var i = 1; i < qdata.length; i+=2 ) {
	    buffer.push( 'Q ' + qdata[i].x+' '+qdata[i].y + ', ' + qdata[i+1].x+' '+qdata[i+1].y );
	}
	return buffer.join(' ');
    };

    // +---------------------------------------------------------------------------------
    // | Convert this polygon to a sequence of cubic bezier curves.
    // |
    // | @param treshold:boolean
    // |
    // | @return cubicBezierData:array:vector
    // +-------------------------------
    _context.Polygon.prototype.toCubicBezierData = function( threshold ) {

	if( typeof treshhold == 'undefined' )
	    threshold = 1.0;

	console.log( 'threshold=' + threshold );
	
	if( this.vertices.length < 3 )
	    return [];
	var cbezier = [];
	var a = this.vertices[0]; 
	var b = this.vertices[1]; 
	var edgeCenter = new Vertex( a.x + (b.x-a.x)/2,   a.y + (b.y-a.y)/2 );
	cbezier.push( edgeCenter );
	
	var limit = this.isOpen ? this.vertices.length-1 : this.vertices.length;
	for( var t = 0; t < limit; t++ ) {
	    var a = this.vertices[ t%this.vertices.length ];
	    var b = this.vertices[ (t+1)%this.vertices.length ];
	    var c = this.vertices[ (t+2)%this.vertices.length ];

	    var aCenter = new Vertex( a.x + (b.x-a.x)/2,   a.y + (b.y-a.y)/2 );
	    var bCenter = new Vertex( b.x + (c.x-b.x)/2,   b.y + (c.y-b.y)/2 );
	    
	    var a2 = new Vertex( aCenter.x + (b.x-aCenter.x)*threshold, aCenter.y + (b.y-aCenter.y)*threshold );
	    var b0 = new Vertex( bCenter.x + (b.x-bCenter.x)*threshold, bCenter.y + (b.y-bCenter.y)*threshold );

	    cbezier.push( a2 );
	    cbezier.push( b0 );
	    cbezier.push( bCenter );
	    
	}
	return cbezier;
	
    };

    // +---------------------------------------------------------------------------------
    // | Convert this polygon to a cubic bezier curve, represented as an SVG data string
    // |
    // | @return svgData:string
    // +-------------------------------
    _context.Polygon.prototype.toCubicBezierSVGString = function() {
	var qdata = this.toCubicBezierData();
	if( qdata.length == 0 )
	    return "";
	var buffer = [ 'M ' + qdata[0].x+' '+qdata[0].y ];
	for( var i = 1; i < qdata.length; i+=3 ) {
	    buffer.push( 'C ' + qdata[i].x+' '+qdata[i].y + ', ' + qdata[i+1].x+' '+qdata[i+1].y + ', ' + qdata[i+2].x + ' ' + qdata[i+2].y );
	}
	return buffer.join(' ');
    };
    
})(window ? window : module.export );
