/**
 * A simple image triangulation (color fill).
 *
 * @author  Ikaros Kappler
 * @date    2017-07-31
 * @version 1.0.0
 **/


Dropzone.autoDiscover = false;
/* Dropzone.options.dzone = {
    //acceptedFiles: "image/jpeg,image/png,image/gif"
    //acceptedFiles: ".mp4,.mkv,.avi"
}*/


(function($) {

    /*
    try {
	var formData = new FormData();
	dropZone = new Dropzone('#upload-widget', {
	    url                : '/demo/portfolio/upload-video', // '/test/histogram/upload-file.ajax.php', // _UPLOAD_URL, // This is configured in line 29
	    method             : 'post',
	    // withCredentials    : true,     // DO NOT SET FOR CORS!
	    paramName          : 'file',
	    maxFilesize        : 12, // MB
	    addRemoveLinks     : true,
	    maxFiles           : 1,
	    thumbnailWidth     : 128,
	    thumbnailHeight    : 128,
	    dictDefaultMessage : 'Drag an image here to upload, or click to select one.',
	    headers: {
		// These headers MUST be allowed by the CORS configuration of the server if you want to use them.
		'x-csrf-token'                 : 'abcdef0123456789',
		'Access-Control-Allow-Headers' : 'Authorization, Content-Type, Accept, X-Mashape-Authorization',
		'Authorization'                : null, // Clear authorizationHeader
		'Cache-Control'                : null,
		'X-Requested-With'             : null
	    },
	    acceptedFiles: ".mp4,.mkv,.avi",
	    acceptedFiles: "video/*",
	    init: function() {
		this.on("addedfile", function(file) {
		    //$uploadPreview.css( 'display', 'inherit' );
		});
		this.on('success', function( file, response ) {
		    var json = jQuery.parseJSON(response);
		});
		this.on('error', function(file, response) {
		    console.error( "Failed to upload file!" );
		    console.error( "Error response: " + response );
		    setErrorStatus( 'Failed to upload file: ' + response );
		} );
		this.on('sending',function(file,xhr,data) {
		    // NOOP
		});
	    }
	}  );
    } catch( e ) {
	console.warn( "Failed to initialize the drop zone: " + e );
    }
    */
    

    //var MAX_DIST  = 200;
    var MIN_SPEED = 10;
    var DEFAULT_CANVAS_WIDTH = 1024;
    var DEFAULT_CANVAS_HEIGHT = 768;
    var POINT_COLORS = [ Color.makeRGB(255,0,0), Color.makeRGB(0,255,0), Color.makeRGB(0,0,255) ];
    
    $( document ).ready( function() {

	var config = {
	    drawPoints : true
	};
	
	var $canvas          = $( 'canvas#my-canvas' );
	var ctx              = $canvas[0].getContext('2d');
	var activePointIndex = 1;
	var image            = null;
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
	// | Draw the given line (between the two points) with the specified color.
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
	// | Draw the given point with the specified color.
	// +-------------------------------
	var drawPoint = function( p, color ) {
	    //console.log( 'draw complex point at ' + z ); 
	    var radius = 3;
	    ctx.beginPath();
	    ctx.arc( p.x, p.y, radius, 0, 2 * Math.PI, false );
	    ctx.fillStyle = color;
	    ctx.fill();
	};

	var drawTriangle = function( t, color ) {
	    ctx.beginPath();
	    ctx.moveTo( t.v0.x, t.v0.y );
	    ctx.lineTo( t.v1.x, t.v1.y );
	    ctx.lineTo( t.v2.x, t.v2.y );
	    ctx.fillStyle = color;
	    ctx.strokeStyle = color;
	    ctx.fill();
	    ctx.stroke();
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
		if( !t.color ) t.color = randomGreyscale().cssRGB();
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
	//$( 'input' ).change( redraw );
	var handleImage = function(e) {
	    var reader = new FileReader();
	    reader.onload = function(event){
		image = new Image();
		image.onload = function(){
		    $canvas[0].width = image.width;
		    $canvas[0].height = image.height;
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
	//console.log( delaunay );
	var triangulate = function() {
	    //console.log( window.Delaunay );
	    var delau = new window.Delaunay( pointList, {} );
	    triangles  = delau.triangulate();
	    // console.log( triangles );
	    redraw();
	};

	// +---------------------------------------------------------------------------------
	// | Add n random points.
	// +-------------------------------
	var randomPoints = function() {
	    pointList = [];
	    // Generate random points.
	    for( var i = 0; i < 25; i++ ) {
		addRandomPoint();
	    }
	    redraw();
	};
	

	$( 'button#triangulate' ).click( triangulate );
	$( 'button#random-points' ).click( function() { randomPoints(); triangulate(); } );
	$( 'input#draw-points' ).change( function(e) { config.drawPoints = $(this).is(':checked'); console.log(config.drawPoints); redraw(); } );

	/*
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
	    if( config.fullSize ) _setSize( window.innerWidth, window.innerHeight );
	    else                  _setSize( DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT );
	};
	$( window ).resize( resizeCanvas );
	*/

	// +---------------------------------------------------------------------------------
	// | Initialize dat.gui?
	// +-------------------------------
	/*
	$(document).ready( function() { 
	    var gui = new dat.gui.GUI();
	    gui.remember(config);
	    gui.add(config, 'pointCount').min(1).max(200).onChange( updatePointCount );
	    gui.add(config, 'drawPoints');
	    gui.add(config, 'drawEdges');
	    gui.add(config, 'speed').min(1).max(25).step(1);
	    gui.add(config, 'maxDist').min(1).max(1000).step(10);
	    gui.add(config, 'clearCanvas');
	    gui.add(config, 'fullSize').onChange( resizeCanvas );
	    gui.add(config, 'randomPointColors' );
	    gui.add(config, 'reset'); // .onChange( reset );
	    //dat.gui.GUI.toggleHide();
	    gui.closed = true;
	} );
	*/

	// Init
	randomPoints();
	
    } ); // END document.ready
    
})(jQuery);

var getInt = function( id ) {
    return parseInt( document.getElementById(id).value );
};


