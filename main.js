/**
 * A simple image triangulation (color fill).
 *
 * @author   Ikaros Kappler
 * @date     2017-07-31
 * @modified 2018-04-03 Added the voronoi-from-delaunay computation.
 * @version  1.0.1
 **/


(function($) {
    
    var DEFAULT_CANVAS_WIDTH = 1024;
    var DEFAULT_CANVAS_HEIGHT = 768;
    
    $( document ).ready( function() {

	var config = {
	    fillTriangles      : true,
	    makeVoronoiDiagram : false,
	    fillAlphaOnly      : false,
	    drawPoints         : true,
	    drawEdges          : false,
	    optimizeGaps       : false,
	    pointCount         : 25,
	    fullSize           : true,
	    triangulate        : false,
	    backgroundColor    : '#ffffff',
	    loadImage          : function() { $('input#file').data('type','image-upload').trigger('click'); },
	    clear              : function() { pointList = []; triangles = []; redraw(); },
	    randomize          : function() { randomPoints(true,false,false); if( config.triangulate ) triangulate(); },
	    fullCover          : function() { randomPoints(true,true,false); if( config.triangulate ) triangulate(); },
	    fullCoverExtended  : function() { randomPoints(true,true,false); if( config.triangulate ) triangulate(); },
	    exportSVG          : function() { exportSVG(); },
	    exportPointset     : function() { exportPointset(); },
	    importPointset     : function() { $('input#file').data('type','pointset-upload').trigger('click'); } 
	};
	
	var $canvas          = $( 'canvas#my-canvas' );
	var ctx              = $canvas[0].getContext('2d');
	var activePointIndex = 1;
	var image            = null; // An image.
	var imageBuffer      = null; // A canvas to read the pixel data from.
	var triangles        = [];
	var voronoiDiagram   = [];
	
	var getFloat = function(selector) {
	    return parseFloat( $(selector).val() );
	};

	var canvasSize = { width : DEFAULT_CANVAS_WIDTH, height : DEFAULT_CANVAS_HEIGHT };

	// A very basic point class.
	// REPLACED BY Vertex CLASS.
	/*
	var Point = function(x,y) {
	    this.x = x;
	    this.y = y;

	    this.clone = function() {
		return new Point(this.x,this.y);
	    };
	    
	    var _self = this;
	    this.scale = function( factor, center ) {
		if( !center || typeof center === "undefined" )
		    ; //center = Point.ORIGIN;
		_self.x = center.x + (_self.x-center.x)*factor;
		_self.y = center.y + (_self.y-center.y)*factor;
		return this;
	    };
	};
	Point.ORIGIN = new Point(0,0);
	*/
	
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
	    var v = randomInt(255);
	    return Color.makeRGB( v, v, v );
	};

	// +---------------------------------------------------------------------------------
	// | Draw the given line (between the two points) with the specified (CSS-) color.
	// +-------------------------------
	var drawLine = function( zA, zB, color ) {
	    //console.log( 'draw complex point at ' + z ); 
	    var radius = 3;
	    ctx.beginPath();
	    ctx.moveTo( offset.x+zA.x, offset.y+zA.y );
	    ctx.lineTo( offset.x+zB.x, offset.y+zB.y );
	    ctx.strokeStyle = color;
	    ctx.lineWidth = 1;
	    ctx.stroke();
	}

	// +---------------------------------------------------------------------------------
	// | Draw the given point with the specified (CSS-) color.
	// +-------------------------------
	var drawPoint = function( p, color ) {
	    var radius = 3;
	    ctx.beginPath();
	    ctx.arc( p.x, p.y, radius, 0, 2 * Math.PI, false );
	    ctx.fillStyle = color;
	    ctx.fill();
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
	    // console.log('image buffer size for triangle: ' + n );
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
		//console.log('[getAverageColorInTriangle] using image.alpha ('+rgba.a+') and background.color ('+bgColor.cssRGB()+')' );
	    }
	    //console.log( 'final triangle alpha: ' + Color.makeRGB( rgba.r, rgba.g, rgba.b, rgba.a ).a );
	    //var finalColor = Color.makeRGB( rgba.r, rgba.g, rgba.b );
	    //finalColor.a = rgba.a;
	    //console.log( 'Making CSS color from (RGBA)=' + finalColor.r +', ' + finalColor.g + ', ' + finalColor.b + ', ' + finalColor.a );
	    //return finalColor.cssRGBA(); // randomGreyscale().cssRGB();
	    return Color.makeRGB( rgba.r, rgba.g, rgba.b, rgba.a ).cssRGBA(); 
	};

	
	// +---------------------------------------------------------------------------------
	// | The re-drawing function.
	// +-------------------------------
	var redraw = function() {
	    // Note that the image might have an alpha channel. Clear the scene first.
	    console.log( '[redraw] config.backgroundColor=' + config.backgroundColor );
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
			//console.log( 'Fetched color for triangle: ' + t.color );
		    }
		}
		drawTriangle( t, t.color );
	    }

	    // Draw points?
	    if( config.drawPoints ) {
		for( var i in pointList ) {
		    var p = pointList[i];
		    drawPoint( p, 'blue' );
		}
	    }

	    // Draw voronoi diagram?
	    if( config.makeVoronoiDiagram ) {
		for( v in voronoiDiagram ) {
		    var cell = voronoiDiagram[v];
		    ctx.beginPath();
		    var centroid = cell[ 0 ].getCircumcircle().center;
		    ctx.moveTo( centroid.x, centroid.y );
		    for( var t = 1; t <= cell.length; t++ ) {
			var centroid = cell[ t%cell.length ].getCircumcircle().center;
			ctx.lineTo( centroid.x, centroid.y );
		    }
		    ctx.strokeStyle = 'green';
		    ctx.lineWidth = 3;
		    ctx.stroke();
		}
	    }
	};

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
	// |  - image for the backgounrd or
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
		    console.log( 'scaleFactor=' + scaleFactor + ', center=' + JSON.stringify(circumCircle.center) + ', radius=' + circumCircle.radius );
		    
		    tri.a = tri.a.clone().scale( scaleFactor, circumCircle.center );
		    tri.b = tri.b.clone().scale( scaleFactor, circumCircle.center );
		    tri.c = tri.c.clone().scale( scaleFactor, circumCircle.center );
		}
	    }
	    
	    redraw();
	};


	// +---------------------------------------------------------------------------------
	// | Convert the triangle set to the Voronoi diagram.
	// +-------------------------------
	/*
	var makeVoronoiDiagram = function() {

	    voronoiDiagram = [];	    
	    for( var t in triangles ) {
		var tri = triangles[t];
		// Find adjacent triangles for first point
		var adjacentSubset = []; 
		for( var u in triangles ) {
		    if( t == u )
			continue;
		    //console.log( "isAdjacent=" + tri.isAdjacent(triangles[u]) + ', tri=' + tri.toString() + ', triangles['+u+']=' + triangles[u].toString() );
		    if( tri.isAdjacent(triangles[u]) )
			adjacentSubset.push( triangles[u] );
		}
		console.log( "[makeVoronoiDiagram] adjacent=" + JSON.stringify(adjacentSubset) );
		var path = subsetToPath(adjacentSubset);
		voronoiDiagram.push( path );
	    }

	    console.log( "[makeVoronoiDiagram] " + JSON.stringify(voronoiDiagram) );
	};
	*/

	
	// +---------------------------------------------------------------------------------
	// | Convert the triangle set to the Voronoi diagram.
	// +-------------------------------
	var makeVoronoiDiagram = function() {
	    voronoiDiagram = [];	    
	    for( var p in pointList ) {
		var point = pointList[p];
		// Find adjacent triangles for first point
		var adjacentSubset = []; 
		for( var t in triangles ) {
		    //console.log( "isAdjacent=" + tri.isAdjacent(triangles[u]) + ', tri=' + tri.toString() + ', triangles['+u+']=' + triangles[u].toString() );
		    if( triangles[t].a.equals(point) || triangles[t].b.equals(point) || triangles[t].c.equals(point) )
			adjacentSubset.push( triangles[t] );
		}
		console.log( "[makeVoronoiDiagram] adjacent=" + JSON.stringify(adjacentSubset) );
		var path = subsetToPath(adjacentSubset);
		voronoiDiagram.push( path );
	    }
	    console.log( "[makeVoronoiDiagram] " + JSON.stringify(voronoiDiagram) );
	};


	// Re-order a tiangle subset so the triangle define a single path.
	var subsetToPath = function( triangleSet ) {
	    if( triangleSet.length == 0 )
		return [];
	    
	    var t       = 0;
	    var result  = [ triangleSet[t] ];
	    var visited = [ t ];
	    //for( var i = 0; i < triangleSet.length; i++ ) {
	    var i = 1; 
	    while( visited.length < triangleSet.length && i < triangleSet.length ) {
		if( visited.indexOf(i) != -1 ) {
		    i++
		    continue;
		}
		if( t != i && triangleSet[t].isAdjacent(triangleSet[i]) ) {
		    result.push(triangleSet[i]);
		    visited.push(i);
		    t = i;
		    i = 1;
		} else {
		    i++;
		}
	    }
	    return result;
	};
	
	// +---------------------------------------------------------------------------------
	// | Add n random points.
	// +-------------------------------
	var randomPoints = function( clear, fullCover ) {
	    if( clear )
		pointList = [];
	    // Generate random points on image border?
	    if( fullCover ) {
		var remainingPoints = config.pointCount-pointList.length;
		var borderPoints    = Math.sqrt(remainingPoints);
		var ratio           = canvasSize.height/canvasSize.width;
		var hCount          = Math.round( (borderPoints/2)*ratio );
		var vCount          = (borderPoints/2)-hCount;
		console.log( 'remainingPoints=' + remainingPoints + ', borderPoints=' + borderPoints + ', hCount=' + hCount + ', vCount=' + vCount );
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
	    redraw();
	};

	// +---------------------------------------------------------------------------------
	// | Called when the desired number of points changes.
	// +-------------------------------
	var updatePointCount = function() {
	    if( config.pointCount > pointList.length )
		randomPoints(false); // Do not clear
	    else if( config.pointCount < pointList.length ) {
		// console.log( 'remove, pointList.length=' + pointList.length + ', config.pointCount=' + config.pointCount );
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
		console.log( 'setSize');
		ctx.canvas.width  = w;
		ctx.canvas.height = h;
		
		$canvas[0].width  = w;
		$canvas[0].height  = h;
		
		canvasSize.width = w;
		canvasSize.height = h;
	    };
	    var width  = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            var height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
	    if( config.fullSize ) _setSize( width, height ); // window.innerWidth, window.innerHeight );
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
	    //buffer.push( '<svg width="' + canvasSize.width + '" height="' + canvasSize.height + '">' );
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

	    // Draw points?
	    if( config.drawPoints ) {
		for( var i in pointList ) {
		    var p = pointList[i];
		    buffer.push( '   <circle cx="'+p.x+'" cy="'+p.y+'" r="3" fill="blue" />' );
		}
	    }
	    buffer.push( '</svg>' );
	    
	    var svgCode = buffer.join("\n");
	    console.log( svgCode );
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
	    gui.add(config, 'pointCount').min(3).max(5200).onChange( function() { config.pointCount = Math.round(config.pointCount); updatePointCount(); } ).title("The total number of points.");
	    gui.add(config, 'triangulate').onChange( function() { if( (config.triangulate || config.makeVoronoiDiagram) ) triangulate(); if( config.makeVoronoiDiagram ) makeVoronoiDiagram(); redraw(); } ).title("Triangulate the point set?");
	    gui.add(config, 'makeVoronoiDiagram').onChange( function() { if( (config.triangulate || config.makeVoronoiDiagram) && triangles.length == 0 ) triangulate(); if( config.makeVoronoiDiagram ) makeVoronoiDiagram(); redraw(); } ).title("(Experimental) Make voronoi diagram from the triangle set.");
	    gui.add(config, 'fillTriangles').onChange( redraw ).title("If selected the triangles will be filled.");
	    gui.add(config, 'fillAlphaOnly').onChange( redraw ).title("Only the alpha channel from the image will be applied.");
	    gui.add(config, 'drawPoints').onChange( redraw ).title("If checked the points will be drawn.");
	    gui.add(config, 'drawEdges').onChange( redraw ).title("If checked the triangle edges will be drawn.");
	    gui.add(config, 'optimizeGaps').onChange( function() { if(config.triangulate) triangulate(); redraw(); } ).title("If checked the triangles are scaled by 0.15 pixels to optimize gaps.");
	    gui.add(config, 'fullSize').onChange( resizeCanvas ).title("Toggles the fullpage mode.");
	    gui.addColor(config, 'backgroundColor').onChange( redraw ).title("Choose a background color.");
	    gui.add(config, 'clear').name('Clear all').title("Clear all.");
	    gui.add(config, 'loadImage').name('Load Image').title("Load a background image to pick triangle colors from.");
	    gui.add(config, 'randomize').name('Randomize').title("Randomize the point set.");
	    gui.add(config, 'fullCover').name('Full Cover').title("Randomize the point set with full canvas coverage.");
	    gui.add(config, 'exportSVG').name('Export SVG').title("Export the current triangulation as a vector image.");
	    gui.add(config, 'exportPointset').name('Export point set').title("Export the point set as JSON.");
	    gui.add(config, 'importPointset').name('Import point set').title("Import the point set from JSON.");	    
	}


	// +---------------------------------------------------------------------------------
	// | Handle left-click and tap event
	// +-------------------------------
	function handleTap(x,y) {
	    pointList.push( new Vertex(x,y) );
	    redraw();
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
	randomPoints(true); // clear
	
    } ); // END document.ready
    
})(jQuery);




