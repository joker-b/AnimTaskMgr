# AnimTaskMgr

## An Animation-Friendly Observer for the Web

AnimTaskMgr provides a simple way to maintain animation performance in web applications while giving your app a chance to get things done that may have nothing to do with animation.

AnimTaskMgr lets you through tasks into a queue that will execute as fast as it can while still maintaining good frame rate. For each frame, it will execute all the tasks in the queue, or, if it can't complete them within the time constraint, wait until next frame to continue working through the queue. This allows you to freely mix all kinds of tasks into your app without so much need to worry about dropping frames or otherwise providing a "chunky" timing experience.

## Typical Use

Here is a simple "tinkertoy" example.

Lets assume that we have a lot of 3D objects to build at startup time, during which a 3D "spinner" indicates ongoing progress.

This example adds one object per cycle of requestAnimationFrame() -- there are alternatives that will be explained further below (for example, building multiple objects per frame). Here is an abbreviated example:

	var ATM = new AnimTaskMgr();

	var scene, camera, renderer;  // just typical THREE.js stuff -- THREE.js not required!

	init();
	animate();

	function init() {
		scene = new THREE.Scene();
	    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10 );
		renderer = new THREE.WebGLRenderer({antialias:true});
		//
		// ... any other setup ...
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
			objParent.add(newObj);
		}
		function objectsReady(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count)
		{
			// action to take now that we're done
			spinner.visible = false;		// hide spinner
			objParent.visible = true;		// show objects
			ATM.halt( spinTask );			// kill redundant "spinTask"
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

1. Create an `AnimTaskManager` object (variable `ATM` in the example)
2. Use the `launch()` method to start tasks running
3. call the `animate()` method somewhere within your animation loop.

In the sample, we've used `launch()` to start two tasks: one to spin the "please wait" spinner until we tell it to stop, and `addRandomObject(),` which will explicitly stop itself after 200 cycles. This second tasks also comes with a companion "wrap-up" function, `objectsReady(),` which will trigger automatically after `addRandomObject()` has decided to halt -- this last function displays the accumulated results, hides the spinner, and, since we don't need it any more. halts the spinner process.

In this case, the wrap-up function is just really wrapping up. Wrap-up functions can also be used to chain animations by making additional `launch()` calls.

## Parameters: We Have Them!

The functions we assign as paramaters to launch() expect several parameters:

* `TimeNow` reports a time in milliseconds that marks when the function execution begins.
* `RelativeTime` -- if the function has a specified duration (more on this later), then `RelativeTime` will be a value ranged from zero to one indicating the overall place in the animation. This value is not clamps to the [0-1] range, and may be shaped by interpolators (again, more later). Otherwise zero.
* `SinceLastFrameTime` is the time, in milliseconds, since this function was last executed. Note that this might be different than the time between `animationRequestFrame()` calls since the task manager can spread tasks across multiple frames if needed to maintain frame rate.
* `SinceStartTime` is the time elapsed, in milliseconds, since the function was `launch()`'ed.
* `Count` counts the number of times this function has been executed (starting at zero).

We only used some of the parameters of `launch()` in this example. A complete call would be:

	ATM.launch(AnimFunc,WrapUpFunc,Duration,Interp);

where the parameters are:

* `AnimFunc` is our main animation function.
* `WrapUpFunc` is an optional wrapup function.
* `Duration` this is a desired duration of animation, in milliseconds (or zero, for infinite)
* `Interp` this is a function that will accept a 0-1 time value and return a 0-1 value, possibly reshaped by splines or other means, to get more complex animation timing (e.g. "slow-in").

Only the `AnimFunc` parameter is required. If you want to specify a `Duration` or `Interp,` be sure to use `null` for `WrapUpFunc` -- likewise, for no `Duration,` use zero and the function will iterate until the power goes out.

## Your AnimFunc

The task manager cannot stop you from doing bad things. So if your animation function contains long processes, well -- refactor them! It's up to you to ensure that inidividual tasks can execute in reasonable amounts of time -- I recommend chunks of 6ms or less. This will give `requestAnimationFrame()` space to do its work.

Consider this alternative to teh example, where we want to let the object builder go as fast as it can (but no faster):

	var objCount = 0;
	function addObjs(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
		while( ((Date.now()-TimeNow)<=6) && (objCount<200) ) {
			var newObj = build_obj();
			newObj.position.set(Math.random(),Math.random(),Math.random());
			newObj.visible = false;
			objParent.add(newObj);
		}
		if (Count >= 200) {
			return true; 			// signal that we're done
		}
	}
	ATM.launch( addObjs, objectsReady );