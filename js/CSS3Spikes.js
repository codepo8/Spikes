/**
 * Copyright (C) 2011 by Paul Lewis
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
var AEROTWIST = AEROTWIST || {};
AEROTWIST.Spikes = new function()
{
	// variables
	var $shape		= $(".shape"),
		$shapeCont	= $(".shape-container"),
		$container	= $("#container"),
		$shadowCont	= $(".shadow-container"),
		$shadow		  = $(".shadow"),
		$spikeRing	= null,
		$faces		  = null,
		canvas		  = $("<canvas/>")[0],
		context		  = canvas.getContext('2d'),
		ang			    = 0,
		r			      = 100,
		steps		    = 70,
		baseVec		  = null,
		mouseVels	  = new Array(10),
		mVelCount	  = 0,
		lastMouseX	= 0,
		lastMouseY	= 0,
		shapeVelX	  = 0,
		shapeVelY	  = 0,
		worldWidth	= 1/$shapeCont.width(),
		worldHeight	= 1/$shapeCont.height(),
		light		    = null,
		lightPhase	= Math.PI,

		// constants
		LIGHT_RADIUS	= 200
		LIGHT_RATE	= 0.01,
		RADS		    = Math.PI/180,
		RATE		    = .5,
		DAMPEN		  = .98;

	var callbacks	= {

		// mouse down
		onMouseDown: function(event) {

			// reset vars
			shapeVelX	= 0;
			shapeVelY	= 0;
			mVelCount	= 0;

			// start tracking
			lastMouseX 	= event.clientX;
			lastMouseY 	= event.clientY;

			$shapeCont.bind('mousemove', callbacks.onMouseMove);
		},

		// mouse up
		onMouseUp: function(event) {

			// stop tracking
			$shapeCont.unbind('mousemove', callbacks.onMouseMove);

			// average the last ten movements
			var v = 10;
			while(v--) {
				if(mouseVels[v]) {
					shapeVelX += mouseVels[v].x;
					shapeVelY += mouseVels[v].y;
				}
			}

			// now scale the velocities down
			shapeVelX *= .1;
			shapeVelY *= .1;

			// reset for next time
			mouseVels = new Array(10);
		},

		// mouse move
		onMouseMove: function(event) {

			// change in x,y
			var xDiff = event.clientX - lastMouseX;
			var yDiff = event.clientY - lastMouseY;

			// store the velocity
			mouseVels[mVelCount++] = {
				x: xDiff,
				y: yDiff
			}

			// wrap
			mVelCount %= 10;

			baseVec.y += xDiff;
			baseVec.x -= yDiff;

			lastMouseX = event.clientX;
			lastMouseY = event.clientY;
		}

	}

	/**
	 * Get going
	 */
	this.init 		= function() {

		// set up the shape's base vector, and the light
		baseVec 	= new AEROTWIST.Vector3(0,0,-1);
		light			= new AEROTWIST.Vector3(-.5,0,-1);
		light.normalize();
		light.move = false;

		// handle clicks, etc
		$(document).bind('selectstart', false);

		$container.mousedown(callbacks.onMouseDown);
		$container.mouseup(callbacks.onMouseUp);

		// set up the colours and shape
		createColours();
		createSpikeRings();

		// turn on the shadow
		$shadowCont.css({display:'block'});

		// add a bit o' spin
		baseVec.x = 10;
		baseVec.y = 15;

		// GO!
		update();
	};

	this.toggleLightMovement = function() {

		light.move = !light.move;

	}

	/**
	 * Main worker
	 */
	function update() {

		// add on our post drag velocity
		baseVec.x -= shapeVelY;
		baseVec.y += shapeVelX;

		// dampen it
		shapeVelX *= DAMPEN;
		shapeVelY *= DAMPEN;

		light.x = Math.sin(lightPhase) * LIGHT_RADIUS;
		light.y = Math.sin(lightPhase * 0.2) * Math.cos(lightPhase * 0.2) * LIGHT_RADIUS * 0.5;
		light.z = Math.cos(lightPhase) * LIGHT_RADIUS;

		light.normalize();

		if(light.move) {
			lightPhase += LIGHT_RATE;
		}

		// now rotate our shape
		$shape.css({
			WebkitTransform: "translateY(-55px) scale(0.7) rotateX("+(baseVec.x)+"deg) rotateY("+(baseVec.y)+"deg)",
			MozTransform: "translateY(-55px) scale(0.7) rotateX("+(baseVec.x)+"deg) rotateY("+(baseVec.y)+"deg)"
		});

		// work out the shadow darkness
		var shadowDarkness = .05 + Math.abs(Math.cos(baseVec.x * RADS) * .3);

		for(var s = 0; s < $shadowCont.length; s++) {

			var thisShadow = $($shadowCont[s]),
				shadScale	= thisShadow.data('scale') || 1;

			thisShadow.css({
				WebkitTransform: "translateZ(-150px) translateY(75px) rotateX(90deg) scale("+((.9-(shadowDarkness *.7)) * shadScale)+")",
				MozTransform: "translateZ(-150px) translateY(75px) rotateX(90deg) scale("+((.9-(shadowDarkness *.7)) * shadScale)+")",
				background: "-webkit-gradient(radial, 50% 50%, 0, 50% 50%, 200, from(rgba(30,4,22,"+shadowDarkness+")), to(rgba(60,9,44,0)))",
				background: "-moz-gradient(radial, 50% 50%, 0, 50% 50%, 200, from(rgba(30,4,22,"+shadowDarkness+")), to(rgba(60,9,44,0)))"
			});
		}


		// colour each face
		for(var f = 0; f < $faces.length; f++) {

			// get the normal vector
			var normal 	= $.data($faces[f]);
			var rotNorm	= new AEROTWIST.Vector3(normal.x,normal.y,normal.z);

			// add on the global rotation
			rotNorm.rotate(baseVec.x,baseVec.y,0);

			// calc the dot product
			var dot = -rotNorm.dot(light);

			// now each face should be coloured depending
			// on the dot product's value
			// dot should be -1 <= dot <= 0 so invert
			var x = Math.max(0,Math.floor(dot * steps-1)) * 60;
			$($faces[f]).css({
				backgroundPosition: '-'+x+'px 0'
			});
		}

		// set up a request for another update
		requestAnimationFrame(update);
	}

	/**
	 * Creates the canvas with the triangle
	 * shapes inside
	 */
	function createColours() {

		canvas.width = 60 * steps;
		canvas.height = 200;

		for(var i = 0; i < canvas.width; i+=60) {

			var l = (i/canvas.width) * 50;
			context.fillStyle = "hsl(338,100%,"+l+"%)";
			context.moveTo(i,200);
			context.beginPath();
			context.lineTo(i+30,0);
			context.lineTo(i+60,200);
			context.lineTo(i,200);
			context.closePath();
			context.fill();

		}
	}

	/**
	 * Creates a ring o' spikes
	 */
	function createSpikeRings() {

		// make the markup
		$spikeRing = $('<div class="spike-ring"></div>');

		// step round the ring twice, once for the outer
		// spike parts, and again for the inner parts
		for(var z = 0; z < 720; z += 60) {

			var scale 	= (z >= 360 ? 0.5 : 1),
				$spike 	= createSpike($spikeRing, z, scale),
				zRads	= z * (Math.PI / 180)
				radius	= (z >= 360) ? -(r+2) : r;

			// transform the inner piece
			$spike.find('.spike-inner').css({
				WebkitTransform: "rotateZ("+z+"deg) scaleY(" + scale + ")",
				MozTransform: "rotateZ("+z+"deg) scaleY(" + scale + ")"
			});

			// and the outer
			$spike.css({
				WebkitTransform: "translateY(" + Math.round(Math.cos(zRads) * -radius)+"px) translateX("+Math.round(Math.sin(zRads) * radius)+"px)",
				MozTransform: "translateY(" + Math.round(Math.cos(zRads) * -radius)+"px) translateX("+Math.round(Math.sin(zRads) * radius)+"px)"
			});
		}

		// append the ring
		$shape.append($spikeRing);

		// cache the faces
		$faces = $shape.find('.face');

	}

	/**
	 * Creates a single spike
	 */
	function createSpike($spikeRing, z, scale)
	{
		var markup	= '<div class="spike">' +
						'<div class="spike-inner">' +
							'<div class="face f"></div>' +
							'<div class="face b"></div>' +
							'<div class="face l"></div>' +
							'<div class="face r"></div>' +
						'</div>' +
					  '</div>';

		var $spike 		= $(markup);
		var fAngle 		= 8.4 * scale;
		var $spikeFaces = $spike.find('.face');
		$spikeFaces.css({
			backgroundImage: "url("+canvas.toDataURL('image/png')+")"
		});

		// assume all faces start by point outwards of the screen,
		// which is correct. Then we will need to further mash things
		// up a little bit
		for(var f = 0; f < $spikeFaces.length; f++) {
			var $face = $($spikeFaces[f]);
			var faceNormal = new AEROTWIST.Vector3(0,0,1);

			// now position each face properly and update the face normal
			// - Front
			if($face.hasClass('f')) {

				$face.css({
					WebkitTransform: "translateZ(29.7px) rotateX(8.6deg) rotateY(0deg)",
					MozTransform: "translateZ(29.7px) rotateX(8.6deg) rotateY(0deg)"
				});

				faceNormal.rotate(fAngle,0,0);
			}

			// - Back
			if($face.hasClass('b')) {

				$face.css({
					WebkitTransform: "translateZ(-29.7px) rotateX(-8.6deg) rotateY(180deg)",
					MozTransform: "translateZ(-29.7px) rotateX(-8.6deg) rotateY(180deg)"
				});

				faceNormal.rotate(-fAngle,180,0);
			}

			// - Left
			if($face.hasClass('l')) {

				$face.css({
					WebkitTransform: "translateX(-29.7px) rotateY(-90deg) rotateX(8.6deg)",
					MozTransform: "translateX(-29.7px) rotateY(-90deg) rotateX(8.6deg)"
				});

				faceNormal.rotate(fAngle,-90,0);
			}

			// - Right
			if($face.hasClass('r')) {
				$face.css({
					WebkitTransform: "translateX(29.7px) rotateY(90deg) rotateX(8.6deg)",
					MozTransform: "translateX(29.7px) rotateY(90deg) rotateX(8.6deg)"
				});

				faceNormal.rotate(fAngle,90,0);
			}

			faceNormal.rotate(0,0,z);
			$.data($face[0], faceNormal);
		}

		$spikeRing.append($spike);

		return $spike;
	}
};

/**
 * Vector base
 */
AEROTWIST.Vector3 = function(x,y,z) {
	this.x = x || 0;
	this.y = y || 0;
	this.z = z || 0;
	this.toRads = (Math.PI/180);
};

/**
 * Normalize
 */
AEROTWIST.Vector3.prototype.normalize = function() {

	var vLen	= Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	this.x /= vLen;
	this.y /= vLen;
	this.z /= vLen;

}

/**
 * Dot product
 */
AEROTWIST.Vector3.prototype.dot = function(v) {

	return this.x * v.x + this.y * v.y + this.z * v.z;

};

/**
 * Rotates a vector
 */
AEROTWIST.Vector3.prototype.rotate = function(rotx,roty,rotz,rads) {

	if(!rads) {
		rotx = rotx ? rotx * this.toRads : 0;
		roty = roty ? roty * this.toRads : 0;
		rotz = rotz ? rotz * this.toRads : 0;
	}

	if(roty) {
		var newX = this.x * Math.cos(roty) + this.z * Math.sin(roty);
		var newZ = -this.x * Math.sin(roty) + this.z * Math.cos(roty);

		this.x = newX;
		this.z = newZ;
	}

	if(rotz) {
		var newX = this.x * Math.cos(rotz) - this.y * Math.sin(rotz);
		var newY = this.x * Math.sin(rotz) + this.y * Math.cos(rotz);

		this.x = newX;
		this.y = newY;
	}
	if(rotx) {
		var newY = this.y * Math.cos(rotx) - this.z * Math.sin(rotx);
		var newZ = this.y * Math.sin(rotx) + this.z * Math.cos(rotx);

		this.y = newY;
		this.z = newZ;
	}

};

// Spikety Spike!
$(document).ready(function(){

	if(Modernizr.csstransforms3d) {
		// Go!
		AEROTWIST.Spikes.init();
	}
});
