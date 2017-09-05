/**
 * A simple image triangulation (color fill).
 *
 * @author  Ikaros Kappler
 * @date    2017-07-31
 * @version 1.0.0
 **/


(function($) {
    
    var DEFAULT_CANVAS_WIDTH = 1024;
    var DEFAULT_CANVAS_HEIGHT = 768;
    
    $( document ).ready( function() {

	var config = {
	    fillTriangles : true,
	    drawPoints    : true,
	    drawEdges     : false,
	    pointCount    : 25,
	    fullSize      : true,
	    triangulate   : false,
	    loadImage     : function() { $('input#image').trigger('click'); },
	    randomize     : function() { randomPoints(true,false); if( config.triangulate ) triangulate(); },
	    fullCover     : function() { randomPoints(true,true); if( config.triangulate ) triangulate(); },
	    exportSVG     : function() { exportSVG(); }
	};
	
	var $canvas          = $( 'canvas#my-canvas' );
	var ctx              = $canvas[0].getContext('2d');
	var activePointIndex = 1;
	var image            = null; // An image.
	var imageBuffer      = null; // A canvas to read the pixel data from.
	var triangles        = [];
	
	var getFloat = function(selector) {
	    return parseFloat( $(selector).val() );
	};

	var canvasSize = { width : DEFAULT_CANVAS_WIDTH, height : DEFAULT_CANVAS_HEIGHT };

	// A very basic point class.
	var Point = function(x,y) {
	    this.x = x;
	    this.y = y;
	};
	
	
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
	// | Generates a random point inside the canvas bounds.
	// +-------------------------------
	var randomPoint = function() {
	    return new Point( randomInt(canvasSize.width), randomInt(canvasSize.height) );
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

	    //console.log( 'triangle bounds: ' + JSON.stringify(bounds) );
	    
	    var pixelData = imageBuffer.getContext('2d').getImageData(bounds.xMin, bounds.yMin, bounds.width, bounds.height).data;
	    var rgba  = { r : pixelData[0], g : pixelData[1], b : pixelData[2], a : pixelData[3] };
	    var n     = pixelData.length;
	    var count = 1;
	    var x     = bounds.xMin;
	    var y     = bounds.yMin;
	    for( var i = 4; i < n; i += 4 ) {
		if( !tri.containsPoint({ x : x, y : y }) )
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
	    rgba.r /= count;
	    rgba.g /= count;
	    rgba.b /= count;
	    rgba.a /= count;
	    return Color.makeRGB( rgba.r, rgba.g, rgba.b, 0.5 ).cssRGBA(); // randomGreyscale().cssRGB();
	};

	// +---------------------------------------------------------------------------------
	// | The re-drawing function.
	// +-------------------------------
	var redraw = function() {
	    if( image ) {
		ctx.drawImage(image,0,0);
	    } else {
		ctx.fillStyle = 'white';
		ctx.fillRect(0,0,canvasSize.width,canvasSize.height);
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

	    // Draw points?
	    if( config.drawPoints ) {
		for( var i in pointList ) {
		    var p = pointList[i];
		    drawPoint( p, 'blue' );
		}
	    }
	};

	// +---------------------------------------------------------------------------------
	// | Initially draw the image (to fill the background).
	// +-------------------------------
	var handleImage = function(e) {
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
	$( 'input#image' ).change( handleImage );


	// +---------------------------------------------------------------------------------
	// | Make the triangulation (Delaunay).
	// +-------------------------------
	var triangulate = function() {
	    //console.log( window.Delaunay );
	    var delau = new Delaunay( pointList, {} );
	    triangles  = delau.triangulate();
	    // console.log( triangles );
	    redraw();
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
		    pointList.push( new Point(0, randomInt(canvasSize.height)) );
		    pointList.push( new Point(canvasSize.width, randomInt(canvasSize.height)) );		    
		    vCount--;
		}
		
		while( hCount > 0 ) {
		    pointList.push( new Point(randomInt(canvasSize.width),0) );
		    pointList.push( new Point(randomInt(canvasSize.width),canvasSize.height) );		    
		    hCount--;
		}

		// Additionally add 4 points to the corners
		pointList.push( new Point(0,0) );
		pointList.push( new Point(canvasSize.width,0) );
		pointList.push( new Point(canvasSize.width,canvasSize.height) );
		pointList.push( new Point(0,canvasSize.height) );
		
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
	    //  if( image ) {
	    //	ctx.drawImage(image,0,0);
	    //  } else {
	    //	ctx.fillStyle = 'white';
	    //	ctx.fillRect(0,0,canvasSize.width,canvasSize.height);
	    //  }	    

	    // Draw triangles
	    for( var i in triangles ) {
		var t = triangles[i];
		/*if( !t.color ) {
		    if( !image ) {
			t.color = randomGreyscale().cssRGB();
		    } else {
			// Pick color from inside triangle
			t.color = getAverageColorInTriangle( imageBuffer, t );
		    }
		}*/
		//drawTriangle( t, t.color );
		//console.log( t.color );
		var color = (t.color!=null ? t.color : randomGreyscale().cssRGB());
		buffer.push( '   <polygon points="' + t.a.x + ',' + t.a.y + ' '+t.b.x+','+t.b.y+' '+t.c.x+','+t.c.y+'" style="fill:'+color+(config.drawEdges?';stroke:purple;stroke-width:1':'')+'" />' );
	    }

	    // Draw points?
	    if( config.drawPoints ) {
		for( var i in pointList ) {
		    var p = pointList[i];
		    //drawPoint( p, 'blue' );
		    //var radius = 3;
		    //ctx.beginPath();
		    //ctx.arc( p.x, p.y, radius, 0, 2 * Math.PI, false );
		    //ctx.fillStyle = color;
		    //ctx.fill();
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
	// | Initialize dat.gui
	// +-------------------------------
	$(document).ready( function() { 
	    var gui = new dat.gui.GUI();
	    gui.remember(config);
	    gui.add(config, 'pointCount').min(3).max(5200).onChange( function() { config.pointCount = Math.round(config.pointCount); updatePointCount(); } ).title("The total number of points.");
	    gui.add(config, 'triangulate').onChange( function() { if(config.triangulate) triangulate(); else triangles=[]; redraw(); } ).title("Triangulate the point set?");
	    gui.add(config, 'fillTriangles').onChange( redraw ).title("If selected the triangles will be filled.");
	    gui.add(config, 'drawPoints').onChange( redraw ).title("If checked the points will be drawn.");
	    gui.add(config, 'drawEdges').onChange( redraw ).title("If checked the triangle edges will be drawn.");
	    gui.add(config, 'fullSize').onChange( resizeCanvas ).title("Toggles the fullpage mode.");
	    gui.add(config, 'loadImage').name('Load Image').title("Load a background image to pick triangle colors from.");
	    gui.add(config, 'randomize').name('Randomize').title("Randomize the point set.");
	    gui.add(config, 'fullCover').name('Full Cover').title("Randomize the point set with full canvas coverage.");
	    gui.add(config, 'exportSVG').name('Export SVG').title("Export the current triangulation as a vector image.");
	    //dat.gui.GUI.toggleHide();
	    //gui.closed = true;
	    
	} );


	// Init
	randomPoints(true); // clear
	
    } ); // END document.ready
    
})(jQuery);




