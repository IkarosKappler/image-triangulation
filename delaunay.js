/**
 * Inspired by
 *    http://www.travellermap.com/tmp/delaunay.htm
 *
 * @author    Ikaros Kappler
 * @date_init 2012-10-17
 * @date      2017-07-31
 * @version   2.0.0
 **/


//--- BEGIN ------------------------ Constants ---------------------------------
/**
 * Use absolute or relative path??!
 **/
/*
var config = {
    backgroundTextureAddress : "./img/page-background-tile.png",
    
    paintEdges             : false,
    fillTriangles          : true,
    paintPoints            : false,
    paintTriangles         : true,
    paintBackgroundTexture : true,
    useAdditionalBoxNodes  : true // false;
};
*/
//--- END -------------------------- Constants ---------------------------------

window.Delaunay = function( pointList, config ) {

	var backgroundTexture;
	var polyCanvas;
	var context;         
	//var vertexSet;
	
	/**
	 * A box array for storing the tiles in PolyBox objects.
	 **/
	var boxes;

	function performPolygonTriangulation() {

	    // return generateTriangles(); 
	    return Triangulate( pointList ); // this.vertexSet );
	}

	//------------------------------------------------------------
	// Vertex class
	//------------------------------------------------------------
	function Vertex( x, y ) {
	    this.x = x;
	    this.y = y;
	    
	} // END Vertex
    
	//------------------------------------------------------------
	// Triangle class
	//------------------------------------------------------------
        function Triangle( a, b, c )	{
	    this.a = a;
	    this.b = b;
	    this.c = c;

	    this.CalcCircumcircle();
	    
	} // END Triangle


	////////////////////////////////////////////////////////////////////////////////
	//
	// Delaunay Triangulation Code, by Joshua Bell
	//
	// Inspired by: http://www.codeguru.com/cpp/data/mfc_database/misc/article.php/c8901/
	//
	// This work is hereby released into the Public Domain. To view a copy of the public 
	// domain dedication, visit http://creativecommons.org/licenses/publicdomain/ or send 
	// a letter to Creative Commons, 171 Second Street, Suite 300, San Francisco, 
	// California, 94105, USA.
	//
	////////////////////////////////////////////////////////////////////////////////


	var EPSILON = 1.0e-6;

	Triangle.prototype.CalcCircumcircle = function() 	{
	    // From: http://www.exaflop.org/docs/cgafaq/cga1.html

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

		function max3( a, b, c ) { return ( a >= b && a >= c ) ? a : ( b >= a && b >= c ) ? b : c; }
		function min3( a, b, c ) { return ( a <= b && a <= c ) ? a : ( b <= a && b <= c ) ? b : c; }

		var minx = min3( this.a.x, this.b.x, this.c.x );
		var miny = min3( this.a.y, this.b.y, this.c.y );
		var maxx = max3( this.a.x, this.b.x, this.c.x );
		var maxy = max3( this.a.y, this.b.y, this.c.y );

		this.center = new Vertex( ( minx + maxx ) / 2, ( miny + maxy ) / 2 );

		dx = this.center.x - minx;
		dy = this.center.y - miny;
	    } else {
		var cx = (D*E - B*F) / G; 
		var cy = (A*F - C*E) / G;

		this.center = new Vertex( cx, cy );

		dx = this.center.x - this.a.x;
		dy = this.center.y - this.a.y;
	    }

	    this.radius_squared = dx * dx + dy * dy;
	    this.radius = Math.sqrt( this.radius_squared );
	}; // CalcCircumcircle

	Triangle.prototype.InCircumcircle = function( v )
	{
	    var dx = this.center.x - v.x;
	    var dy = this.center.y - v.y;
	    var dist_squared = dx * dx + dy * dy;

	    return ( dist_squared <= this.radius_squared );
	    
	}; // InCircumcircle


	//------------------------------------------------------------
	// Edge class
	//------------------------------------------------------------
	function Edge( a, b )	{
	    this.a = a;
	    this.b = b;
	    
	} // Edge


	//------------------------------------------------------------
	// Triangulate
	//
	// Perform the Delaunay Triangulation of a set of vertices.
	//
	// vertices: Array of Vertex objects
	//
	// returns: Array of Triangles
	//------------------------------------------------------------
        function Triangulate( vertices ) {
	    var triangles = [];

	    //
	    // First, create a "supertriangle" that bounds all vertices
	    //
	    var st = CreateBoundingTriangle( vertices );
	    
	    triangles.push( st );

	    // begin the triangulation one vertex at a time
	    var i;
	    for( i in vertices ) {
		// NOTE: This is O(n^2) - can be optimized by sorting vertices
		// along the x-axis and only considering triangles that have 
		// potentially overlapping circumcircles

		var vertex = vertices[i];
		AddVertex( vertex, triangles );
	    }

	    //
	    // Remove triangles that shared edges with "supertriangle"
	    //
	    for( i in triangles ) {
		var triangle = triangles[i];

		if( triangle.a == st.a || triangle.a == st.b || triangle.a == st.c ||
		    triangle.b == st.a || triangle.b == st.b || triangle.b == st.c ||
		    triangle.c == st.a || triangle.c == st.b || triangle.c == st.c ) {
		    delete triangles[i];
		}
	    }

	    return triangles;
	    
	} // Triangulate


	// Internal: create a triangle that bounds the given vertices, with room to spare
	function CreateBoundingTriangle( vertices ) {
	    // NOTE: There's a bit of a heuristic here. If the bounding triangle 
	    // is too large and you see overflow/underflow errors. If it is too small 
	    // you end up with a non-convex hull.
	    
	    var minx, miny, maxx, maxy;
	    for( var i in vertices )
	    {
		var vertex = vertices[i];
		if( minx === undefined || vertex.x < minx ) { minx = vertex.x; }
		if( miny === undefined || vertex.y < miny ) { miny = vertex.y; }
		if( maxx === undefined || vertex.x > maxx ) { maxx = vertex.x; }
		if( maxy === undefined || vertex.y > maxy ) { maxy = vertex.y; }
	    }

	    var dx = ( maxx - minx ) * 10;
	    var dy = ( maxy - miny ) * 10;
	    
	    var stv0 = new Vertex( minx - dx,   miny - dy*3 );
	    var stv1 = new Vertex( minx - dx,   maxy + dy   );
	    var stv2 = new Vertex( maxx + dx*3, maxy + dy   );

	    return new Triangle( stv0, stv1, stv2 );
	    
	} // CreateBoundingTriangle


	// Internal: update triangulation with a vertex 
        function AddVertex( vertex, triangles )	{
	    //console.log( 'Adding vertex ...' );
	    var edges = [];
	    
	    // Remove triangles with circumcircles containing the vertex
	    var i;
	    for( i in triangles ) {
		var triangle = triangles[i];

		if( triangle.InCircumcircle( vertex ) ) {
		    edges.push( new Edge( triangle.a, triangle.b ) );
		    edges.push( new Edge( triangle.b, triangle.c ) );
		    edges.push( new Edge( triangle.c, triangle.a ) );

		    delete triangles[i];
		}
	    }

	    edges = UniqueEdges( edges );

	    // Create new triangles from the unique edges and new vertex
	    for( i in edges ) {
		// console.log( 'adding triangle' );
		var edge = edges[i];
		triangles.push( new Triangle( edge.a, edge.b, vertex ) );
	    }	
	} // AddVertex


	// Internal: remove duplicate edges from an array
	function UniqueEdges( edges ) {
	    // TODO: This is O(n^2), make it O(n) with a hash or some such
	    var uniqueEdges = [];
	    for( var i in edges ) {
		var edge1 = edges[i];
		var unique = true;

		for( var j in edges ) {
		    if( i != j ) {
			var edge2 = edges[j];

			if( ( edge1.a == edge2.a && edge1.b == edge2.b ) ||
			    ( edge1.a == edge2.b && edge1.b == edge2.a ) ) {
			    unique = false;
			    break;
			}
		    }
		}
		
		if( unique ) 
		    uniqueEdges.push( edge1 );
		
	    }

	    return uniqueEdges;
	    
	} // UniqueEdges

    // Do some pseudo exports
    this.triangulate = performPolygonTriangulation;
    //console.log( this.triangulate );
}; // END _constructor



// console.log( delaunay );
