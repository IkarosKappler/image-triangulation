/**
 * A simple voronoi cell (part of a voronoi diagram), stored as an array of 
 * adjacent triangles.
 *
 * @requires Triangle
 *
 * @author   Ikaros Kappler
 * @date     2018-04-11
 * @modified 2018-05-04 Added the 'sharedVertex' param to the constructor. Extended open cells into 'infinity'.
 * @version  1.0.1
 **/

(function(context) {
    "strict mode";
    
    // +---------------------------------------------------------------------------------
    // | The constructor.
    // |
    // | @param triangles:Array{Triangle} The passed triangle array must contain an ordered sequence of
    // |                                  adjacent triangles.
    // | @param sharedVertex:Vertex       This is the 'center' of the voronoi cell; all triangles must share
    // |                                  that vertex.
    // | 
    // +-------------------------------
    context.VoronoiCell = function( triangles, sharedVertex ) {
	if( typeof triangles == 'undefined' )
	    triangles = [];
	if( typeof sharedVertex == 'undefined' )
	    sharedVertex = new Vertex(0,0);
	this.triangles = triangles;
	this.sharedVertex = sharedVertex;
    };

    
    // +--------------------------------------------------------------------------------
    // | Check if the first and the last triangle in the path are NOT connected.
    // +-------------------------------
    context.VoronoiCell.prototype.isOpen = function() {
	// There must be at least three triangles
	return this.triangles.length < 3 || !this.triangles[0].isAdjacent(this.triangles[this.triangles.length-1]);	   
    };


    // +---------------------------------------------------------------------------------
    // | Convert the voronoi cell path data to an SVG polygon data string.
    // |
    // | "x0,y0 x1,y1 x2,y2 ..." 
    // +-------------------------------
    context.VoronoiCell.prototype.toPathSVGString = function() {
	if( this.triangles.length == 0 )
	    return "";	
	var arr = this.toPathArray();
	return arr.map( function(vert) { return ''+vert.x+','+vert.y; } ).join(' '); 
    };

    
    // +---------------------------------------------------------------------------------
    // | Convert the voronoi cell path data to an array.
    // |
    // | [vertex0, vertex1, vertex2, ... ] 
    // +-------------------------------
    context.VoronoiCell.prototype.toPathArray = function() {
	console.log( 'to path array' );
	
	if( this.triangles.length == 0 )
	    return [];
	if( this.triangles.length == 1 )
	    return [ this.triangles[0].getCircumcircle() ];
	
	var arr = [];

	// Urgh, this is not working right now.
	if( false && this.isOpen() ) {
	    console.log( "Adding opening point ..." );
	    // Open voronoi cell are infite. Find the infinte edge on the
	    //  OPENING side.
	    var tri     = this.triangles[0];
	    var neigh   = this.triangles[1];
	    var center  = tri.getCircumcircle().center;
	    // Find non-adjacent edge (=outer edge)
	    var edgePoint = _findOuterEdgePoint( tri, neigh, this.sharedVertex );
	    //console.log( 'edgePoint=' + edgePoint );
	    // Case A: Circumcenter is inside triangle.
	    var halfEdgePoint = new Vertex( this.sharedVertex.x + (edgePoint.x-this.sharedVertex.x)/2,
					    this.sharedVertex.y + (edgePoint.y-this.sharedVertex.y)/2 );
	    if( tri.containsPoint(center) || neigh.containsPoint(center) ) halfEdgePoint.scale( 1000, center );
	    else     		            halfEdgePoint.scale( -1000, center );
	    console.log( 'open edge point: ' + JSON.stringify(halfEdgePoint) );
	    arr.push( halfEdgePoint );
	}
	
	for( var t = 0; t < this.triangles.length; t++ ) {
	    var cc = this.triangles[t].getCircumcircle();
	    arr.push( cc.center );
	}

	// Urgh, this is not working right now.
	if( false && this.isOpen() ) {
	    console.log( "Adding closing point ..." );
	    // Open voronoi cell are infite. Find the infinte edge on the
	    //  CLOSING side.
	    var tri = this.triangles[ this.triangles.length-1 ];
	    var center  = tri.getCircumcircle().center;
	    // Find non-adjacent edge (=outer edge)
	    var edgePoint = _findOuterEdgePoint( tri, this.triangles[this.triangles.length-2], this.sharedVertex );
	    // Case A: Circumcenter is inside triangle.
	    var halfEdgePoint = new Vertex( this.sharedVertex.x + (edgePoint.x-this.sharedVertex.x)/2,
					    this.sharedVertex.y + (edgePoint.y-this.sharedVertex.y)/2 );
	    if( tri.containsPoint(center) ) halfEdgePoint.scale( 1000, center );
	    else     		            halfEdgePoint.scale( -1000, center );
	    
	    arr.push( halfEdgePoint );
	}
	
	return arr;
    }

    // +---------------------------------------------------------------------------------
    // | Find the outer (not adjacent) vertex in triangle 'tri' which has triangle 'neighbour'.
    // |
    // | This function is used to determine outer hull points.
    // |
    // | @return Vertex
    // +-------------------------------
    var _findOuterEdgePoint = function( tri, neighbour, sharedVertex ) {
	if( tri.a.equals(sharedVertex) ) {
	    if( neighbour.a.equals(tri.b) || neighbour.b.equals(tri.b) || neighbour.c.equals(tri.b) ) return tri.c;
	    else return tri.b;
	}
	if( tri.b.equals(sharedVertex) ) {
	    if( neighbour.a.equals(tri.a) || neighbour.b.equals(tri.a) || neighbour.c.equals(tri.a) ) return tri.c;
	    else return tri.a;
	}
	// Here:
	//    tri.c.equals(sharedVertex) 
	if( neighbour.a.equals(tri.a) || neighbour.b.equals(tri.a) || neighbour.c.equals(tri.a) ) return tri.b;
	else return tri.a;
    };
    
})(window ? window : module.export);
