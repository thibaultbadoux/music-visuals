function createAudioMeter(audioContext,clipLevel,averaging,clipLag) {
	var processor = audioContext.createScriptProcessor(512);
	processor.onaudioprocess = volumeAudioProcess;
	processor.clipping = false;
	processor.lastClip = 0;
	processor.volume = 0;
	processor.clipLevel = clipLevel || 0.98;
	processor.averaging = averaging || 0.95;
	processor.clipLag = clipLag || 750;

	// this will have no effect, since we don't copy the input to the output,
	// but works around a current Chrome bug.
	processor.connect(audioContext.destination);

	processor.checkClipping =
		function(){
			if (!this.clipping)
				return false;
			if ((this.lastClip + this.clipLag) < window.performance.now())
				this.clipping = false;
			return this.clipping;
		};

	processor.shutdown =
		function(){
			this.disconnect();
			this.onaudioprocess = null;
		};

	return processor;
}

function volumeAudioProcess( event ) {
	var buf = event.inputBuffer.getChannelData(0);
    var bufLength = buf.length;
	var sum = 0;
    var x;

	// Do a root-mean-square on the samples: sum up the squares...
    for (var i=0; i<bufLength; i++) {
    	x = buf[i];
    	if (Math.abs(x)>=this.clipLevel) {
    		this.clipping = true;
    		this.lastClip = window.performance.now();
    	}
    	sum += x * x;
    }

    // ... then take the square root of the sum.
    var rms =  Math.sqrt(sum / bufLength);

    // Now smooth this out with the averaging factor applied
    // to the previous sample - take the max here because we
    // want "fast attack, slow release."
    this.volume = Math.max(rms, this.volume*this.averaging);
}



/**
 * Create global accessible variables that will be modified later
 */
var audioContext = null;
var meter = null;
var rafID = null;
var mediaStreamSource = null;

// Retrieve AudioContext with all the prefixes of the browsers
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// Get an audio context
audioContext = new AudioContext();

/**
 * Callback triggered if the microphone permission is denied
 */
function onMicrophoneDenied() {
    alert('Stream generation failed.');
}

/**
 * Callback triggered if the access to the microphone is granted
 */
function onMicrophoneGranted(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);
    // Create a new volume meter and connect it.
    meter = createAudioMeter(audioContext);
    mediaStreamSource.connect(meter);

    // Trigger callback that shows the level of the "Volume Meter"
    onLevelChange();
}

var size;

/**
 * This function is executed repeatedly
 */
function onLevelChange(time) {
    // check if we're currently clipping

    size = 1 + meter.volume * 10;

    // set up the next callback
    rafID = window.requestAnimationFrame(onLevelChange);
}


// Try to get access to the microphone
try {

    // Retrieve getUserMedia API with all the prefixes of the browsers
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // Ask for an audio input
    navigator.getUserMedia(
        {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            },
        },
        onMicrophoneGranted,
        onMicrophoneDenied
    );
} catch (e) {
    alert('getUserMedia threw exception :' + e);
}

function getRandColor () {
    var rand = meter.volume * 100;

    switch (true) {
        case rand < 40:
          console.log(rand);
          return '0xffffff';
          break;
        case rand >= 40 && rand <= 45:
          console.log(rand);
          return '0x0000ff';
          break;
        case rand > 45 && rand <= 50:
          console.log(rand);
          return '0xff0000';
          break;
        case rand > 50 && rand <= 55:
          console.log(rand);
          return '0x00ff00';
          break;
        case rand > 55:
          console.log(rand);
          return '0xffff00';
          break;
    }
}


var geometry = new THREE.BoxGeometry( 1, 1, 1 );
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var material = new THREE.MeshBasicMaterial( { color: 0xffffff } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

var highestVolume = 0;
var lastVolume = 0;

function animate() {
	requestAnimationFrame( animate );

    if(meter.volume > highestVolume) {
      console.log(highestVolume);
      highestVolume = meter.volume;
    }

	if(meter.volume >= 0.4 && lastVolume < 0.4) {
      cube.material.color.setHex(getRandColor());
    }

    lastVolume = meter.volume;

    cube.scale.x = size;
    cube.scale.y = size;
    cube.scale.z = size;

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.1;
	renderer.render( scene, camera );
}
animate();
