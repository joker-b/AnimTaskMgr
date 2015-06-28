# AnimTaskMgr

## An Animation-Friendly Task Dispatcher for the Web

AnimTaskMgr provides a simple way to maintain animation performance in web applications while giving your app a chance to get things done that may have nothing to do with animation.

AnimTaskMgr lets you toss tasks into a queue that will execute as fast as it can while still maintaining good frame rate. Launch you task using the manager and it will do the rest -- just fire and forget. For each frame, it will execute all the tasks in the queue; or, if it can't complete them within the time constraint, wait until next frame to continue working through the queue. This allows you to freely mix all kinds of tasks into your app without so much need to worry about dropping frames or otherwise providing a "chunky" timing experience.

Finally, AnimTskManager provides a schemes for tweaking the timing "feel" of animation activities and allows you to chain all types of activities together into complex actions like sliding a UI element into place, playing a sound and then blinking to indicate its readiness.

## Typical Use

Here is a simple "tinkertoy" example.

Let's assume that we have a lot of 3D objects to build at startup time, during which a 3D "spinner" indicates ongoing progress.

Below is some abbreviated code. It shows a typical example using THREE.js (THREE.js is not at all required -- all animation schemes benefit). You'll see we start the `AnimTskMgr` then add a couple of tasks to it and just let the manager handle the grunt work during our animation loop. Done.

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
		var spinTask = ATM.launch( spinSpinner );	// remember this task for later...

		//
		// launch a process that will build 200 objects...
		//
		function addOneObject(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
			if (Count >= 200) {
				return true; 			// signal that we're done
			}
			var newObj = build_obj();
			newObj.position.set(Math.random(),Math.random(),Math.random());
			newObj.visible = false;
			objParent.add(newObj);
		}
		function objectsReady(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
			// action to take now that we're done
			spinner.visible = false;		// hide spinner
			objParent.visible = true;		// show objects
			ATM.halt( spinTask );			// kill redundant "spinTask"
		}
		ATM.launch( addOneObject, objectsReady ); // ignore returned task, it will halt itself
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
3. Call the `animate()` method somewhere within your animation loop.

In the sample, we've used `launch()` to start two tasks: one to spin the "please wait" spinner until we tell it to stop, and `addOneObject(),` which will explicitly stop itself after 200 cycles. This second task also comes with a companion "wrap-up" function, `objectsReady(),` which will trigger automatically after `addOneObject()` has decided to halt -- this last function displays the accumulated objects, hides the spinner, and, since we don't need it any more. halts the spinner's spin task.

In this case, the wrap-up function really is just  wrapping up. Wrap-up functions can also be used to chain animations by making additional `launch()` calls.

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
* `Duration` this is a desired duration of animation, in milliseconds (or zero, for infinite).
* `Interp` this is a function that will accept a 0-1 time value and return a 0-1 value, possibly reshaped by splines or other means, to get more complex animation timing (e.g. "slow-in").

Only the `AnimFunc` parameter is required. If you want to specify a `Duration` or `Interp,` be sure to use `null` for `WrapUpFunc` -- likewise, for no `Duration,` use zero and the function will iterate until the power goes out.

## Your AnimFunc

The task manager cannot stop you from doing bad things. So if your animation function contains long processes, well -- refactor them! It's up to you to ensure that inidividual tasks can execute in reasonable amounts of time -- I recommend chunks of 6ms or less. This will give `requestAnimationFrame()` space to do its work.

Consider this alternative to the example, where we want to let the object builder go as fast as it can (but no faster):

	var objCount = 0;
	function addObjects(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
		while( ((Date.now()-TimeNow)<=6) && (objCount<200) ) {
			var newObj = build_obj();
			newObj.position.set(Math.random(),Math.random(),Math.random());
			newObj.visible = false;
			objParent.add(newObj);
			objCount += 1;
		}
		if (objCount >= 200) {
			return true; 			// signal that we're done
		}
	}
	ATM.launch( addObjects, objectsReady );

The usual caveats about Javascript garbage collection apply here -- try to avoid creating new objects in your AnimFunc, including additoional function() declarations, etc. They will cause a new allocation every frame, and you will pay in performance jankiness when the GC decides to discard things.

## Chaining tasks

Series of tasks can be chained together by using the .chain() method on individual tasks.

	var task1 = AnimTaskMgr.launch();
	var task2 = task1.chain();

The .chain() method taks exactly the same arguments as the .launch method.

Since both methods return the new task, so it's strightforward to build up longer sequences by dot-chaining:

	AnimTaskMgr.launch().chain().chain.chain();

Will run the four tasks in sequence. Of course, if any tasks has an infinite duration, none of its chained children would ever execute! For this reason, if .chain() is executed on a task that does have an infinite diuration, the first task will immediately chain on the next animation frame, just as if its duration were complete.

### WrapUp functions

When a task has a WrapupFunc defined, the WrapUp will execute on the next animation frame after the task completes. It will also execute before any chained task begins.

This interplay between chaining and wrapup functions are the only way to get the wrapup function to execute if you've assigned it to an otherwise-infinite task.

## Interpolators

Details coming soon, prommise.