# AnimTaskMgr

## An Animation-Friendly Observer for the Web

AnimTaskMgr provides a simple way to maintain animation performance in web applications while giving your app a chance to get things done that may have nothing to do with animation.

AnimTaskMgr lwts you through tasks into a queue that will execute as fast as it can while still maintaining good frame rate. For each frame, it will execute all the tasks in teh queue, or, if it can't complete them within the time constraint, wait until next frame to continue working through the queue. This allows you to freely mix all kinds of tasks into your app without so much need to worry about dropping frames or otherwise provideing a "chunky" timing experience.

## Typical Use

Here is a simple "tinkertoy example. Lets assume that we have a lot of 3D objects to build at startup time, during which a 3D "spinner" indicates ongoing progress.

This example adds one object per cycle of requestAnimationFrame() -- therea are alternatives that will be explained further below. Here is an abbreviated example:

	var ATM = new AnimTaskMgr();

	var scene, camera, renderer;  // just typical THREE.js stuff -- THREE.js not required!

	init();
	animate();

	function init() {
		scene = new THREE.Scene();
	    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10 );
		renderer = new THREE.WebGLRenderer({antialias:true});
		//
		// ... any other THREE.js setup ...
		//
		// 
		var spinner = init_spinner(scene,...); // add a "spinner" object while we're waiting for objects
		// ...
		//
		objParent = new THREE.Objects3D; // we will add some more children to this "null "object"
		scene.add(objParent);
		objParent.visible = false;

		//
		// launch a process to spin the spinner, while we wait for other things
		//
		function spinSpinner(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
			spinner.rotation.x += 0.001;
			spinner.rotation.y += 0.002;
		}
		var spinTask = ATM.launch( spinSpinner );

		//
		// launch a process that will build 200 objects...
		//
		function addRandomObject(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count)
		{
			if (Count >= 200) {
				return true; 			// signal that we're done
			}
			var newObj = build_obj();
			newObj.position.set(Math.random(),Math.random(),Math.random());
			newObj.visible = false;
			objParent.add(newObjj);
		}
		function objectsReady(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count)
		{
			// action to take now that we're done
			spinner.visible = false;
			objParent.visible = true;
			ATM.halt(spinTask);
		}

		var buildTask = ATM.launch( addRandomObject, objectsReady );
	}

	function animate() {
	    requestAnimationFrame( animate );
	    ATM.animate();
	    renderer.render( scene, camera );
	}

## Explanation

For most uses, you can get by with just three simple operations:

1. Create an AnimTaskManager object (variable "ATM" in the example)
2. Use the launch() method to start tasks running
3. call the animate() method somewhere within your animation loop.

In the sample, we've used launch() to start two tasks: one to spin the spinner until we tell it to stop, and  addRandomObject(), which will explicitly stop itself after 200 cycles. This second tasks also comes with a companion "wrap-up" function, objectsReady(), which will trigger after addRandomObject() has decided to halt -- this last function displays the accumulated results, hides the spinner, and, since we don't need it any more. halts the spinner process.

