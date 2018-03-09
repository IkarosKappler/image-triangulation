/**
 * Inspired by
 *    http://www.travellermap.com/tmp/delaunay.htm
 *
 * @author    Ikaros Kappler
 * @date_init 2012-10-17
 * @date      2017-07-31
 * @version   2.0.0
 **/

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

	    this.clone = function() {
		return new Vertex(this.x,this.y);
	    };
	}
        // END Vertex
    
	//------------------------------------------------------------
	// Triangle class
	//------------------------------------------------------------
        function Triangle( a, b, c )	{
	    this.a = a;
	    this.b = b;
	    this.c = c;

	    this.calcCircumcircle();
	    
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

        // Currrently not in use
        /*Triangle.prototype.getCentroid = function() {
	    return new Vertex( (this.a.x + this.b.x + this.c.x),
			       (this.a.y + this.b.y + this.x.y)
			     );
	};*/
    
        
        Triangle.prototype.getCircumcircle = function() {
	    if( !this.center || !this.radius ) 
		this.calcCircumcircle();
	    return { center : this.center.clone(), radius : this.radius };
	};

        /* 
        Triangle.prototype.getCircumCenter = function() {
	    if( !this.center ) 
		this.calcCircumcircle();
	    return  this.center.clone();
	};
	*/
	    
	Triangle.prototype.calcCircumcircle = function() 	{
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
	    /**
	     * Point-in-Triangle test found at
	     *   http://stackoverflow.com/questions/2049582/how-to-determine-a-point-in-a-2d-triangle
	     **/
	    function pointIsInTriangle( px, py, p0x, p0y, p1x, p1y, p2x, p2y ) {
		
		var area = 1/2*(-p1y*p2x + p0y*(-p1x + p2x) + p0x*(p1y - p2y) + p1x*p2y);

		var s = 1/(2*area)*(p0y*p2x - p0x*p2y + (p2y - p0y)*px + (p0x - p2x)*py);
		var t = 1/(2*area)*(p0x*p1y - p0y*p1x + (p0y - p1y)*px + (p1x - p0x)*py);

		return s > 0 && t > 0 && (1-s-t) > 0;
	    };

	    return pointIsInTriangle( p.x, p.y, this.a.x, this.a.y, this.b.x, this.b.y, this.c.x, this.c.y );
        }
    
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
	    var st = createBoundingTriangle( vertices );
	    
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
	function createBoundingTriangle( vertices ) {
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
	    
	} // createBoundingTriangle


	// Internal: update triangulation with a vertex 
        function AddVertex( vertex, triangles )	{
	    //console.log( 'Adding vertex ...' );
	    var edges = [];
	    
	    // Remove triangles with circumcircles containing the vertex
	    var i;
	    for( i in triangles ) {
		var triangle = triangles[i];

		if( triangle.inCircumcircle( vertex ) ) {
		    edges.push( new Edge( triangle.a, triangle.b ) );
		    edges.push( new Edge( triangle.b, triangle.c ) );
		    edges.push( new Edge( triangle.c, triangle.a ) );

		    delete triangles[i];
		}
	    }

	    edges = mkUniqueEdges( edges );

	    // Create new triangles from the unique edges and new vertex
	    for( i in edges ) {
		// console.log( 'adding triangle' );
		var edge = edges[i];
		triangles.push( new Triangle( edge.a, edge.b, vertex ) );
	    }	
	} // AddVertex


	// Internal: remove duplicate edges from an array
	function mkUniqueEdges( edges ) {
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
	    
	} // END mkUniqueEdges

    // Do some pseudo exports
    this.triangulate = performPolygonTriangulation;
    //console.log( this.triangulate );
}; // END _constructor



// console.log( delaunay );
