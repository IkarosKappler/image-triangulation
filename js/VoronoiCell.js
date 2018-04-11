/**
 * A simple voronoi cell (part of a voronoi diagram), stored as an array of 
 * adjacent triangles.
 *
 * @requires Triangle
 *
 * @author  Ikaros Kappler
 * @date    2018-04-11
 * @version 1.0.0
 **/

(function(context) {
    "strict mode";
    
    // +---------------------------------------------------------------------------------
    // | The constructor.
    // |
    // | The passed triangle array must contain an ordered sequence of
    // | adjacent triangles.
    // +-------------------------------
    context.VoronoiCell = function(triangles) {
	if( typeof triangles == 'undefined' )
	    triangles = [];
	this.triangles = triangles;
    };

    
    // +--------------------------------------------------------------------------------
    // | Check if the first and the last triangle in the path are NOT connected.
    // +-------------------------------
    context.VoronoiCell.prototype.isOpen = function() {
	// There must be at least three triangles
	return this.triangles.length < 3 && !this.triangles[0].isAdjacent(this.triangles[this.triangles.length-1]);	   
    };


    // +---------------------------------------------------------------------------------
    // | Convert the voronoi cell path data to an SVG polygon data string.
    // |
    // | "x0,y0 x1,y1 x2,y2 ..." 
    // +-------------------------------
    context.VoronoiCell.prototype.toPathSVGString = function() {
	if( this.triangles.length == 0 )
	    return "";
	
	var arr = [];
	for( var t = 0; t < this.triangles.length; t++ ) {
	    var cc = this.triangles[t].getCircumcircle();
	    arr.push( cc.center.x );
	    arr.push( ',' );
	    arr.push( cc.center.y );
	}

	// Cloes path?
	if( !this.isOpen() ) {
	    var cc = this.triangles[0].getCircumcircle();
	    arr.push( cc.center.x );
	    arr.push( ',' );
	    arr.push( cc.center.y );
	}
	
	return arr.join(' ');
    };
    
})(window ? window : module.export);
