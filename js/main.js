/**
 * A simple 2d point set and image triangulation (color fill).
 *
 * @requires Vertex, Triangle, Polygon, VoronoiCell, delaunay, delaunay2voronoi
 *
 * @author   Ikaros Kappler
 * @date     2017-07-31
 * @modified 2018-04-03 Added the voronoi-from-delaunay computation.
 * @modified 2018-04-11 Added the option to draw circumcircles.
 * @modified 2018-04-14 Added quadratic bezier Voronoi cells.
 * @modified 2018-04-16 Added cubic bezier Voronoi cells.
 * @modified 2018-04-22 Added SVG export for cubic and quadratic voronoi cells.
 * @version  1.0.6
 **/


(function($) {
    "use strict";
    
    const DEFAULT_CANVAS_WIDTH = 1024;
    const DEFAULT_CANVAS_HEIGHT = 768;
    
    $( document ).ready( function() {
	// +---------------------------------------------------------------------------------
	// | A global config that's attached to the dat.gui control interface.
	// +-------------------------------
	var config = {
	    fillTriangles         : true,
	    makeVoronoiDiagram    : false,
	    fillAlphaOnly         : false,
	    drawPoints            : true,
	    drawEdges             : false,
	    drawCircumCircles     : false,
	    drawQuadraticCurves   : false,
	    drawCubicCurves       : false,
	    voronoiCubicThreshold : 1.0,
	    optimizeGaps          : false,
	    pointCount            : 25,
	    fullSize              : true,
	    triangulate           : true,
	    autoUpdateOnChange    : true,
	    backgroundColor       : '#ffffff',
	    loadImage             : function() { $('input#file').data('type','image-upload').trigger('click'); },
	    clear                 : function() { pointList = []; triangles = []; voronoiDiagram = []; redraw(); },
	    randomize             : function() { randomPoints(true,false,false); trianglesPointCount = -1; rebuild(); },
	    fullCover             : function() { randomPoints(true,true,false); trianglesPointCount = -1; rebuild(); },
	    fullCoverExtended     : function() { randomPoints(true,true,false); trianglesPointCount = -1; rebuild() },
	    exportSVG             : function() { exportSVG(); },
	    exportPointset        : function() { exportPointset(); },
	    importPointset        : function() { $('input#file').data('type','pointset-upload').trigger('click'); } 
	};
	
	var $canvas             = $( 'canvas#my-canvas' );
	var ctx                 = $canvas[0].getContext('2d');
	var draw                = new drawutils(ctx);
	var activePointIndex    = 1;
	var image               = null; // An image.
	var imageBuffer         = null; // A canvas to read the pixel data from.
	var triangles           = [];
	var trianglesPointCount = -1;    // Keep track of the number of points when the triangles were generated.
	var voronoiDiagram      = [];
	
	
	var getFloat = function(selector) {
	    return parseFloat( $(selector).val() );
	};

	var canvasSize = { width : DEFAULT_CANVAS_WIDTH, height : DEFAULT_CANVAS_HEIGHT };

	
	// A list of point-velocity-pairs.
	var pointList  = [];

	// +---------------------------------------------------------------------------------
	// | Adds a random point to the point list. Needed for initialization.
	// +-------------------------------
	var addRandomPoint = function() {
	    pointList.push( randomPoint() );
	};
	

	// +---------------------------------------------------------------------------------
	// | Removes a random point from the point list.
	// +-------------------------------
	var removeRandomPoint = function() {
	    if( pointList.length > 1 )
		pointList.pop();
	};

	// +---------------------------------------------------------------------------------
	// | A negative-numbers friendly max function (determines the absolute max and
	// | preserves the signum.
	// +-------------------------------
	var absMax = function(value,max) {
	    if( Math.abs(value) < max ) return Math.sign(value)*max;
	    return value;
	};


	// +---------------------------------------------------------------------------------
	// | Locates the point (index) at the passed position. Using an internal tolerance of 3 pixels.
	// | Returns -1 if no point is near the passed position.
	// +-------------------------------
	var locatePointNear = function( x, y ) {
	    var tolerance = 3;
	    for( i in pointList ) {
		var p = pointList[i];
		let dist = Math.sqrt( Math.pow(x-p.x,2) + Math.pow(y-p.y,2) );
		if( dist <= tolerance )
		    return i;
	    }
	    return -1;
	}
	

	// +---------------------------------------------------------------------------------
	// | Generates a random point inside the canvas bounds.
	// +-------------------------------
	var randomPoint = function() {
	    return new Vertex( randomInt(canvasSize.width), randomInt(canvasSize.height) );
	};

	// +---------------------------------------------------------------------------------
	// | Generates a random int value between 0 and max (both inclusive).
	// +-------------------------------
	var randomInt = function(max) {
	    return Math.round( Math.random()*max );
	};

	// +---------------------------------------------------------------------------------
	// | Generates a random color object.
	// +-------------------------------
	var randomColor = function() {
	    return Color.makeRGB( randomInt(255), randomInt(255), randomInt(255) );
	};

	// +---------------------------------------------------------------------------------
	// | Generates a random color object with r=g=b.
	// +-------------------------------
	var randomGreyscale = function() {
	    var v = 32 + randomInt(255-32);
	    return Color.makeRGB( v, v, v );
	};

	
	// +---------------------------------------------------------------------------------
	// | Draw the given triangle with the specified (CSS-) color.
	// +-------------------------------
	var drawTriangle = function( t, color ) {
	    ctx.beginPath();
	    ctx.moveTo( t.a.x, t.a.y );
	    ctx.lineTo( t.b.x, t.b.y );
	    ctx.lineTo( t.c.x, t.c.y );
	    ctx.fillStyle = color;
	    ctx.strokeStyle = color;
	    if( config.fillTriangles )
		ctx.fill();
	    if( config.drawEdges )
		ctx.stroke();
	};

	
	// +---------------------------------------------------------------------------------
	// | Get average color in triangle.
	// | @param imageBuffer:canvas
	// +-------------------------------
	var getAverageColorInTriangle = function( imageBuffer, tri ) {
	    var bounds = tri.bounds();
	    // Empty triangle?
	    if( bounds.width < 1 || bounds.height < 1 )
		return randomGreyscale().cssRGB();

	    var bgColor = Color.makeHEX( config.backgroundColor );

	    // Get the 'average' color by picking a random pixel inside the bounds.
	    // This pixel must be inside the canvas.
	    bounds.xMin = Math.max(0,bounds.xMin);
	    bounds.yMin = Math.max(0,bounds.yMin);
	    bounds.xMax = Math.min(canvasSize.width-1,bounds.xMax);
	    bounds.yMax = Math.min(canvasSize.height-1,bounds.yMax);
	    bounds.width = bounds.xMax-bounds.xMin;
	    bounds.height = bounds.yMax-bounds.yMin;
	    
	    
	    var pixelData = imageBuffer.getContext('2d').getImageData(bounds.xMin, bounds.yMin, bounds.width, bounds.height).data;
	    var rgba  = { r : pixelData[0], g : pixelData[1], b : pixelData[2], a : pixelData[3] };
	    var n     = pixelData.length;
	    var count = 1;
	    var x     = bounds.xMin;
	    var y     = bounds.yMin;
	    for( var i = 4; i < n; i += 4 ) {
		if( !tri.containsPoint({ x : x, y : y }) || x < 0 || x >= canvasSize.width || y < 0 || y >= canvasSize.height )
		    continue;
		rgba.r += pixelData[i];
		rgba.g += pixelData[i+1];
		rgba.b += pixelData[i+2];
		rgba.a += pixelData[i+3];
		count++;
		x++;
		if( x-bounds.xMin >= bounds.width ) {
		    x = bounds.xMin;
		    y++;
		}    
	    }

	    // Map alpha from 0..255 to 0..1
	    rgba.a = Math.max(0.0, Math.min(1.0, (rgba.a/count)/255.0) );
	    if( !config.fillAlphaOnly ) {
		rgba.r /= count;
		rgba.g /= count;
		rgba.b /= count;
	    } else {
		rgba.r = bgColor.r;
		rgba.g = bgColor.g;
		rgba.b = bgColor.b;
	    }
	    return Color.makeRGB( rgba.r, rgba.g, rgba.b, rgba.a ).cssRGBA(); 
	};

	
	// +---------------------------------------------------------------------------------
	// | The re-drawing function.
	// +-------------------------------
	var redraw = function() {
	    // Note that the image might have an alpha channel. Clear the scene first.
	    ctx.fillStyle = config.backgroundColor; // 'white';
	    ctx.fillRect(0,0,canvasSize.width,canvasSize.height);

	    // Draw the background image?
	    if( image ) {
		ctx.drawImage(image,0,0);
	    } 

	    // Draw triangles
	    for( var i in triangles ) {
		var t = triangles[i];
		if( !t.color ) {
		    if( !image ) {
			t.color = randomGreyscale().cssRGB();
		    } else {
			// Pick color from inside triangle
			t.color = getAverageColorInTriangle( imageBuffer, t );
		    }
		}
		drawTriangle( t, t.color );
	    }

	    if( config.drawCircumCircles )
		drawCircumCircles();
	    
	    // Draw points?
	    if( config.drawPoints ) {
		for( var i in pointList ) {
		    var p = pointList[i];
		    draw.point( p, 'blue' );
		}
	    }
	    
	    // Draw voronoi diagram?
	    if( config.makeVoronoiDiagram )
		drawVoronoiDiagram();
	    if( config.drawQuadraticCurves )
		drawQuadraticBezierVoronoi();
	    if( config.drawCubicCurves )
		drawCubicBezierVoronoi();
	};

	
	// +---------------------------------------------------------------------------------
	// | Draw the stored voronoi diagram.
	// +-------------------------------	
	var drawVoronoiDiagram = function() {
	    for( var v in voronoiDiagram ) {
		var cell = voronoiDiagram[v];
		ctx.beginPath();
		var centroid = cell.triangles[ 0 ].getCircumcircle().center;
		ctx.moveTo( centroid.x, centroid.y );
		for( var t = 1; t < cell.triangles.length; t++ ) {
		    var centroid = cell.triangles[ t ].getCircumcircle().center;
		    ctx.lineTo( centroid.x, centroid.y );
		}
		// Close cell?
		// Only cells inside the triangulation should be closed. Border
		// cell are incomplete.
		if( !cell.isOpen() ) // cell[0].isAdjacent( cell[cell.length-1] ) )
		    ctx.closePath();
		ctx.strokeStyle = 'green';
		ctx.lineWidth = 1;
		ctx.stroke();
	    }
	};

	
	// +---------------------------------------------------------------------------------
	// | Draw the circumcircles of all triangles.
	// +-------------------------------
	var drawCircumCircles = function() {
	    ctx.strokeStyle = 'white';
	    ctx.lineWidth = 0.5;
	    for( var t in triangles ) {
		var cc = triangles[t].getCircumcircle();
		ctx.beginPath();
		ctx.arc( cc.center.x, cc.center.y, cc.radius, 0, Math.PI*2 );
		ctx.closePath();
		ctx.stroke();		
	    }
	};

	
	// +---------------------------------------------------------------------------------
	// | Draw the voronoi cells as quadratic bezier curves.
	// +-------------------------------
	var drawQuadraticBezierVoronoi = function() {
	    for( var c in voronoiDiagram ) {
		var cell = voronoiDiagram[c];
		if( cell.isOpen() || cell.triangles.length < 3 )
		    continue;
		
		ctx.beginPath();

		// Do the above with some neat polygon and bezier transformations.
		var qbezier = new Polygon(cell.toPathArray(),cell.isOpen()).toQuadraticBezierData();
		ctx.moveTo( qbezier[0].x, qbezier[0].y );
		for( var t = 1; t < qbezier.length; t+=2 ) {
		    ctx.quadraticCurveTo( qbezier[t].x, qbezier[t].y, qbezier[t+1].x, qbezier[t+1].y );
		}
		
		ctx.closePath();
		ctx.strokeStyle = 'rgb(255,128,0)';
		ctx.fillStyle = 'rgba(0,128,255,0.5)';
		ctx.fill();
		ctx.stroke();
	    } // END for
	    
	};

	// +---------------------------------------------------------------------------------
	// | Draw the voronoi cells as quadratic bezier curves.
	// +-------------------------------
	var drawCubicBezierVoronoi = function() {
	    console.log( 'draw quadratic curves' );
	    for( var c in voronoiDiagram ) {
		var cell = voronoiDiagram[c];
		if( cell.isOpen() || cell.triangles.length < 3 )
		    continue;
		
		ctx.beginPath();
		
		var cbezier = new Polygon(cell.toPathArray(),cell.isOpen()).toCubicBezierData( config.voronoiCubicThreshold );
		ctx.moveTo( cbezier[0].x, cbezier[0].y );
		for( var t = 1; t+2 < cbezier.length; t+=3 ) {
		    ctx.bezierCurveTo( cbezier[t].x, cbezier[t].y,
				       cbezier[t+1].x, cbezier[t+1].y,
				       cbezier[t+2].x, cbezier[t+2].y
				     );
		}
		ctx.closePath();
		ctx.fillStyle = 'rgba(0,128,255,0.5)';
		ctx.strokeStyle = 'rgb(255,128,0)';
		ctx.fill();
		ctx.stroke();
	    }
	    
	}; // END drawCubicBezierVoronoi
	
	// +---------------------------------------------------------------------------------
	// | Handle a dropped image: initially draw the image (to fill the background).
	// +-------------------------------
	var handleImage = function(e) {
	    var validImageTypes = "image/gif,image/jpeg,image/jpg,image/gif,image/png";
	    if( validImageTypes.indexOf(e.target.files[0].type) == -1 ) {
		if( !window.confirm('This seems not to be an image ('+e.target.files[0].type+'). Continue?') )
		    return;
	    }	    
	    var reader = new FileReader();
	    reader.onload = function(event){
		image = new Image();
		image.onload = function(){
		    $canvas[0].width = image.width;
		    $canvas[0].height = image.height;
		    canvasSize.width = image.width;
		    canvasSize.height = image.height;
		    // Create image buffer
		    imageBuffer        = document.createElement('canvas');
		    imageBuffer.width  = image.width;
		    imageBuffer.height = image.height;
		    imageBuffer.getContext('2d').drawImage(image, 0, 0, image.width, image.height);
		    redraw();
		}
		image.src = event.target.result;
	    }
	    reader.readAsDataURL(e.target.files[0]);     
	}


	// +---------------------------------------------------------------------------------
	// | Handle a dropped JSON file (pointset data).
	// +-------------------------------
	var handlePointset = function(e) {
	    var reader = new FileReader();
	    reader.onload = function(event){
		var json = event.target.result;
		console.log('JSON: ' + json );
		try {
		    var pointset = JSON.parse(json);
		    console.log( JSON.stringify(pointset) );
		    pointList = [];
		    for( i in pointset ) {
			var tuple = pointset[i];
			pointList.push( new Vertex(tuple.x,tuple.y) );
		    }
		    redraw();
		} catch( e ) {
		    console.log( e );
		}
	    }
	    reader.readAsText(e.target.files[0]);     
	}

	
	// +---------------------------------------------------------------------------------
	// | Decide which file type should be handled:
	// |  - image for the background or
	// |  - JSON for the point set)
	// +-------------------------------
	var handleFile = function(e) {
	    var type = $( 'input#file' ).data('type');
	    console.log('upload type: ' + type );
	    if( type == 'image-upload' ) {
		handleImage(e);
	    } else if( type == 'pointset-upload' ) {
		handlePointset(e);
	    } else {
		console.log('Unrecognized upload type: ' + type );
	    }
	    
	}
	$( 'input#file' ).change( handleFile );


	// +---------------------------------------------------------------------------------
	// | The rebuild function just evaluates the input and
	// |  - triangulate the point set?
	// |  - build the voronoi diagram?
	// +-------------------------------
	var rebuild = function() {
	    // Only re-triangulate if the point list changed.
	    if( (config.triangulate || config.makeVoronoiDiagram) && trianglesPointCount != pointList.length ) triangulate();
	    if( config.makeVoronoiDiagram ) makeVoronoiDiagram();
	    redraw();
	};

	
	// +---------------------------------------------------------------------------------
	// | Make the triangulation (Delaunay).
	// +-------------------------------
	var triangulate = function() {
	    //console.log( window.Delaunay );
	    var delau = new Delaunay( pointList, {} );
	    triangles  = delau.triangulate();

	    // Optimize triangles?
	    if( config.optimizeGaps > 0 ) {
		for( i in triangles ) {
		    var tri = triangles[i];
		    var circumCircle = tri.getCircumcircle(); // { center:Vector, radius:Number }
		    var scaleFactor = (circumCircle.radius+0.1) / circumCircle.radius;
		    
		    tri.a = tri.a.clone().scale( scaleFactor, circumCircle.center );
		    tri.b = tri.b.clone().scale( scaleFactor, circumCircle.center );
		    tri.c = tri.c.clone().scale( scaleFactor, circumCircle.center );
		}
	    }

	    trianglesPointCount = pointList.length;
	    voronoiDiagram = [];
	    redraw();
	};


	// +---------------------------------------------------------------------------------
	// | Convert the triangle set to the Voronoi diagram.
	// +-------------------------------
	var makeVoronoiDiagram = function() {
	    var voronoiBuilder = new delaunay2voronoi(pointList,triangles);
	    try {
		voronoiDiagram = voronoiBuilder.build();
	    } catch( e ) {
		// Draw illegal triangle set?
		if( voronoiBuilder.failedTriangleSet ) {
		    console.log( 'The error report contains an unconnected set of triangles ('+voronoiBuilder.failedTriangleSet.length+'):' );
		    for( var i in voronoiBuilder.failedTriangleSet ) {
			var tri = voronoiBuilder.failedTriangleSet[i];
			drawTriangle( tri, 'red' );
			draw.circle( tri.center, tri.radius, 'red' );
		    }
		}
		throw e;
	    }
	    redraw();
	}
	
	// +---------------------------------------------------------------------------------
	// | Add n random points.
	// +-------------------------------
	var randomPoints = function( clear, fullCover, doRedraw ) {
	    if( clear )
		pointList = [];
	    // Generate random points on image border?
	    if( fullCover ) {
		var remainingPoints = config.pointCount-pointList.length;
		var borderPoints    = Math.sqrt(remainingPoints);
		var ratio           = canvasSize.height/canvasSize.width;
		var hCount          = Math.round( (borderPoints/2)*ratio );
		var vCount          = (borderPoints/2)-hCount;
		
		while( vCount > 0 ) {
		    pointList.push( new Vertex(0, randomInt(canvasSize.height)) );
		    pointList.push( new Vertex(canvasSize.width, randomInt(canvasSize.height)) );		    
		    vCount--;
		}
		
		while( hCount > 0 ) {
		    pointList.push( new Vertex(randomInt(canvasSize.width),0) );
		    pointList.push( new Vertex(randomInt(canvasSize.width),canvasSize.height) );		    
		    hCount--;
		}

		// Additionally add 4 points to the corners
		pointList.push( new Vertex(0,0) );
		pointList.push( new Vertex(canvasSize.width,0) );
		pointList.push( new Vertex(canvasSize.width,canvasSize.height) );
		pointList.push( new Vertex(0,canvasSize.height) );
		
	    }
	    
	    // Generate random points.
	    for( var i = pointList.length; i < config.pointCount; i++ ) {
		addRandomPoint();
	    }
	    if( doRedraw )
		redraw();
	};

	// +---------------------------------------------------------------------------------
	// | Called when the desired number of points changes.
	// +-------------------------------
	var updatePointCount = function() {
	    if( config.pointCount > pointList.length )
		randomPoints(false,false,true); // Do not clear ; no full cover ; do redraw
	    else if( config.pointCount < pointList.length ) {
		// Remove n-m points
		pointList = pointList.slice( 0, config.pointCount );
		redraw();
	    }
		
	};
	

	// +---------------------------------------------------------------------------------
	// | This function resizes the canvas to the requied settings (toggles fullscreen).
	// +-------------------------------
	var resizeCanvas = function() {
	    var _setSize = function(w,h) {
		ctx.canvas.width  = w;
		ctx.canvas.height = h;
		
		$canvas[0].width  = w;
		$canvas[0].height  = h;
		
		canvasSize.width = w;
		canvasSize.height = h;
	    };
	    var width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
	    if( config.fullSize ) _setSize( width, height );
	    else                  _setSize( DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT );
	    redraw();
	};
	$( window ).resize( resizeCanvas );
	resizeCanvas();


	// +---------------------------------------------------------------------------------
	// | This function builds an SVG file from the current point triangulation
	// | (export does not include the image).
	// +-------------------------------
	var exportSVG = function() {
	    var buffer = [];
	    buffer.push( '<?xml version="1.0" standalone="yes"?>' );
	    buffer.push( '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' );
	    buffer.push( '   "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' );
	    buffer.push( '<svg width="' + canvasSize.width + '" height="' + canvasSize.height + '" version="1.1" ' );
	    buffer.push( '   xmlns="http://www.w3.org/2000/svg">' );	    

	    // Draw triangles
	    for( var i in triangles ) {
		var t = triangles[i];
		var color = (t.color!=null ? t.color : randomGreyscale().cssRGB());
		buffer.push( '   <polygon points="' + t.a.x + ',' + t.a.y + ' '+t.b.x+','+t.b.y+' '+t.c.x+','+t.c.y+'" style="fill:'+color+(config.drawEdges?';stroke:purple;stroke-width:1':'')+'" />' );
	    }

	    // Draw circumcircles?
	    if( config.drawCircumcircles ) {
		for( var t in triangles ) {
		    var cc = triangles[t].getCircumcircle();
		    buffer.push( '   <circle cx="' + cc.center.x + '" cy="' + cc.center.y + '" r="' + cc.radius + '" style="stroke: white; stroke-width 0.5; fill : none;" class="circum" />' );
		}
	    }
	    
	    // Draw quadratic bezier cells?
	    if( config.drawQuadraticCurves ) {
		//console.log('draw quadratic bezier curves' );
		for( var c in voronoiDiagram ) {
		    var cell = voronoiDiagram[c];
		    var qstring = new Polygon(cell.toPathArray(),cell.isOpen()).toQuadraticBezierSVGString();
		    buffer.push( '   <path d="' + qstring + '" stroke="rgb(255,128,0)" fill="rgba(0,128,255,0.5)" class="qvc" />' );
		}
	    }

	    // Draw quadratic bezier cells?
	    if( config.drawCubicCurves ) {
		console.log('draw cubic bezier curves' );
		for( var c in voronoiDiagram ) {
		    var cell = voronoiDiagram[c];
		    var cstring = new Polygon(cell.toPathArray(),cell.isOpen()).toCubicBezierSVGString( config.voronoiCubicThreshold );
		    buffer.push( '   <path d="' + cstring + '" stroke="rgb(255,128,0)" fill="rgba(0,128,255,0.5)" class="cvc" />' );
		}
	    }
		
	    // Draw points?
	    if( config.drawPoints ) {
		for( var i in pointList ) {
		    var p = pointList[i];
		    buffer.push( '   <circle cx="'+p.x+'" cy="'+p.y+'" r="3" fill="blue" />' );
		}
	    }

	    // Draw voronoi?
	    for( var v in voronoiDiagram ) {
		var cell = voronoiDiagram[v];		
		buffer.push( '   <polygon points="' + cell.toPathSVGString() +'" style="fill: none; stroke:green;stroke-width:2px;" />' );
	    }
	    	    
	    buffer.push( '</svg>' );
	    
	    var svgCode = buffer.join("\n");
	    $('#svg-preview').empty().html( svgCode );
	    var blob = new Blob([svgCode], {
		type: 'application/svg+xml;charset=utf-8'
	    });
	    saveAs(blob,'triangulation.svg');
	};

	
	// +---------------------------------------------------------------------------------
	// | This function exports the point set as a JSON string.
	// +-------------------------------
	var exportPointset = function() {
	    var json = JSON.stringify(pointList);
	    var blob = new Blob([json], {
		type: 'application/json;charset=utf-8'
	    });
	    saveAs(blob,'pointset.json');	    
	};
	
	
	// +---------------------------------------------------------------------------------
	// | Initialize dat.gui
	// +-------------------------------
        { 
	    var gui = new dat.gui.GUI();
	    gui.remember(config);

	    var f0 = gui.addFolder('Points');
	    f0.add(config, 'pointCount').min(3).max(5200).onChange( function() { config.pointCount = Math.round(config.pointCount); updatePointCount(); } ).title("The total number of points.");
	    f0.add(config, 'randomize').name('Randomize').title("Randomize the point set.");
	    f0.add(config, 'fullCover').name('Full Cover').title("Randomize the point set with full canvas coverage.");
	    f0.add(config, 'clear').name('Clear all').title("Clear all.");
	    f0.add(config, 'drawPoints').onChange( redraw ).title("If checked the points will be drawn.");
	    f0.open();
	    
	    var f1 = gui.addFolder('Delaunay');
	    f1.add(config, 'triangulate').onChange( rebuild ).title("Triangulate the point set?");
	    f1.add(config, 'fillTriangles').onChange( redraw ).title("If selected the triangles will be filled.");
	    f1.add(config, 'fillAlphaOnly').onChange( redraw ).title("Only the alpha channel from the image will be applied.");
	    f1.add(config, 'drawEdges').onChange( redraw ).title("If checked the triangle edges will be drawn.");
	    f1.add(config, 'drawCircumCircles').onChange( redraw ).title("If checked the triangles circumcircles will be drawn.");
	    f1.add(config, 'optimizeGaps').onChange( rebuild ).title("If checked the triangles are scaled by 0.15 pixels to optimize gaps.");

	    var f2 = gui.addFolder('Voronoi');
	    f2.add(config, 'makeVoronoiDiagram').onChange( rebuild ).title("Make voronoi diagram from the triangle set.");
	    f2.add(config, 'drawQuadraticCurves').onChange( redraw ).title("If checked the Voronoi's quadratic curves will be drawn.");
	    f2.add(config, 'drawCubicCurves').onChange( redraw ).title("If checked the Voronoi's cubic curves will be drawn.");
	    f2.add(config, 'voronoiCubicThreshold').min(0.0).max(1.0).onChange( redraw ).title("(Experimental) Specifiy the cubic coefficients.");
	    
	    var f3 = gui.addFolder('Settings');
	    f3.add(config, 'fullSize').onChange( resizeCanvas ).title("Toggles the fullpage mode.");
	    f3.addColor(config, 'backgroundColor').onChange( redraw ).title("Choose a background color.");
	    f3.add(config, 'loadImage').name('Load Image').title("Load a background image to pick triangle colors from.");
	    f3.add(config, 'autoUpdateOnChange').onChange( rebuild ).title("Update when points are added.");
	    
	    var f4 = gui.addFolder('Import & Export');
	    f4.add(config, 'exportSVG').name('Export SVG').title("Export the current triangulation as a vector image.");
	    f4.add(config, 'exportPointset').name('Export point set').title("Export the point set as JSON.");
	    f4.add(config, 'importPointset').name('Import point set').title("Import the point set from JSON.");	    
	}


	// +---------------------------------------------------------------------------------
	// | Handle left-click and tap event
	// +-------------------------------
	function handleTap(x,y) {
	    pointList.push( new Vertex(x,y) );
	    if( config.autoUpdateOnChange ) rebuild();
	    else    		            redraw();
	}

	var canvasDragged = false;
	var dragPointIndex = -1;
	$canvas.mousedown(function(e) {
	    if( e.which != 1 )
		return; // Only react on eft mouse
	    canvasDragged = false;
	    var posX = $(this).offset().left,
		posY = $(this).offset().top;
	    var x = e.pageX - posX, y = e.pageY - posY;
	    dragPointIndex = locatePointNear(x,y);
	} );
	$canvas.mousemove(function(e) {
	    canvasDragged = true;
	    if( dragPointIndex != -1 ) {
		var posX = $(this).offset().left,
		    posY = $(this).offset().top;
		var x = e.pageX - posX, y = e.pageY - posY;
		pointList[dragPointIndex].x = x;
		pointList[dragPointIndex].y = y;
		redraw();
		//drawPoint( pointList[dragPointIndex], 'grey' );
	    }
	} );
	$canvas.mouseup(function(e) {
	    if( e.which != 1 )
		return; // Only react on eft mouse
	    if( !canvasDragged ) {
		var posX = $(this).offset().left,
		    posY = $(this).offset().top;
		handleTap( e.pageX - posX, e.pageY - posY );
	    }
	    canvasDragged = false;
	    dragPointIndex = -1;
	} );

	// Init
	randomPoints(true,false,false); // clear ; no full cover ; do not redraw
	rebuild();
	
    } ); // END document.ready
    
})(jQuery);




