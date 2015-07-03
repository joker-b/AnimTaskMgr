# AnimTaskMgr

## An Animation-Friendly Task Dispatcher for the Web

### Because *there are no good apps with a bad frame rate*

AnimTaskMgr provides a simple way to maintain animation performance in web applications while giving your app a chance to get things done that may or may not have nothing to do with animation.

AnimTaskMgr lets you toss tasks as functions into a queue that will execute as fast as it can while still *maintaining good frame rate* -- that is, it prioritizes frame rate *first,* over executing your code. If it takes multiple frames to get your tasks done, they will get done, but multiple frames will still get drawn. Just launch your task using the manager and it will do the rest -- you can fire and forget.

For each frame, AnimTaskMgr will try to execute all the tasks in the queue; or, if it can't complete them within the time constraint, wait until next frame to continue working through the queue. This allows you to freely mix all kinds of tasks into your app without so much need to worry about dropping frames or otherwise providing a "chunky" timing experience.

Finally, AnimTaskManager provides a schemes for tweaking the timing "feel" of animation activities and allows you to chain all types of activities together into complex actions like sliding a UI element into place, playing a sound and then blinking to indicate its readiness.

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
		function spinSpinner(Clock) {
			spinner.rotation.x += 0.001;
			spinner.rotation.y += 0.002;
		}
		var spinTask = ATM.launch( spinSpinner );	// remember this task for later...

		//
		// launch a process that will build 200 objects...
		//
		function addOneObject(Clock) {
			if (Clock.count >= 200) {
				return true; 			// signal that we're done
			}
			var newObj = build_obj();
			newObj.position.set(Math.random(),Math.random(),Math.random());
			newObj.visible = false;
			objParent.add(newObj);
		}
		function objectsReady(Clock) {
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

The functions we assign as paramaters to launch() expect a `Clock` object containing several parameters:

* `.now` reports a time in milliseconds that marks when the function execution begins.
* `.relative` -- if the function has a specified duration (more on this later), then `RelativeTime` will be a value ranged from zero to one indicating the overall place in the animation. This value is not clamps to the [0-1] range, and may be shaped by interpolators (again, more later). Otherwise zero.
* `.sinceLastFrame` is the time, in milliseconds, since this function was last executed. Note that this might be different than the time between `animationRequestFrame()` calls since the task manager can spread tasks across multiple frames if needed to maintain frame rate.
* `.sinceStart` is the time elapsed, in milliseconds, since the function was `launch()`'ed.
* `.count` counts the number of times this function has been executed (starting at zero).

We only used some of the parameters of `launch()` in this example. A complete call would be:

	ATM.launch(AnimFunc,WrapUpFunc,Duration,Interp);

where the parameters are:

* `AnimFunc` is our main animation function.
* `WrapUpFunc` is an optional wrapup function.
* `Duration` this is a desired duration of animation, in milliseconds (or zero, for infinite).
* `Interp` this is a function that will accept a 0-1 time value and return a 0-1 value, possibly reshaped by splines or other means, to get more complex animation timing (e.g. "slow-in").

Only the `AnimFunc` parameter is required. If you want to specify a `Duration` or `Interp` with no WrapUp, just be sure to use `null` for `WrapUpFunc` -- likewise, for no `Duration,` use zero and the function will iterate until the power goes out (or you `.halt()` it, or `.chain()` to something else, as we'll see later on below).

## Your AnimFunc

The AnimFunc does whatever tasks you set it nibble-sized chunks. These tasks can be anything: animation on-screen, physics evaluations, audio processing, parts of a game AI, etc. By breaking your tasks into bite-sized chunks, you help ensure a smooth, responsive experience for the end user. 

If an AnimFunc completes some larger task that might take many frames, return `true` to tell the AnimTaskMgr that the overall task is complete.

Consider this alternative to the first example, where we want to let the object builder go as fast as it can (but no faster):

	// var objParent = new THREE.Object3D(); // already dedclared...
	var objCount = 0;
	function addObjects(Clock) {
		while( ((Date.now()-Clock.now)<=6) && (objCount<200) ) {
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

Here we give ourselves a 6 millisecond limit, and add as many new chunks to "objParent" as we can in the time alloted.

### Prudent Task Construction

The task manager cannot stop you from doing bad things. So if your animation function contains long processes or ones that do a lot of excessive memory allocation/deallocations, well -- refactor them! It's up to you to ensure that inidividual tasks can execute in reasonable amounts of time -- I recommend chunks of 6ms or less. This will give `requestAnimationFrame()` space to do its work.

In the example above, we're adding objects but they are *persistent* objects -- so they're not subject to garbage collection during the loop. All the usual caveats about Javascript garbage collection avoidance apply here: try not to create new temporary objects in your AnimFunc, including additional function() declarations, etc. They will cause a new allocation/de-allocation every frame, and you will pay in performance jankiness when the GC decides to discard things.

### `AnimFunc === null`

You *can* pass `null` as the AnimFunc -- a *null task* will start. Null tasks provide a way to create arbitrary delays, and they may still have a wrapup function, and can be chained.

It's possible to create an infinite null task, say `ATM.launch(null,null,0.0)` but it's hard to imagine cases where this is really useful. The task can be used to .chain() new tasks but it would really be better to just `.launch()` them instead.

## Chaining tasks

Series of tasks can be chained together by using the `.chain()` method on individual tasks.

	var task1 = AnimTaskMgr.launch();
	var task2 = task1.chain();

The `.chain()` method taks exactly the same arguments as the `.launch()` method. *If you don't specify an interpolator for a chained task, it will inherit the interpolator of its parent task.*

Since both methods return the new task, so it's strightforward to build up longer sequences by dot-chaining:

	tkd = AnimTaskMgr.launch(FuncA,null,5.0)
						.chain(FuncB,null,1.0)
						.chain(FuncC,null,2.0)
						.chain(FuncD,WrapABCD,5.0);

Will run the four tasks in sequence. Of course, if any task runs infinitely, none of its chained children would ever execute! For this reason, if `.chain()` is executed on a task that *does* have an infinite duration (e.g., `Duration === 0`), then the parent task will immediately stop and chain on the next animation frame, just as if its duration were complete.

#### Parallel Chains

A single task can have multiple chains. Just call `.chain()` as much as you like. This can be especailly handy when the different chains items have different scopes or expected durations. All chained tasks will enter into the managers time stream on the same frame, in the order you defined them.

#### Talking to Your (Chained) Kids

In the `.chain` example immediately above, what if the duration of `FuncC` needed to be adjusted by something happening in `FuncB`? The stack above will only return the task of `FuncD` so the other objects are invisible. Fortunately, we can get task identifiers both up and down the `chain()` chain.

Using `.rootTask()` will return chain "parents" -- you can add a count as a qualifier, to after the above example, running

	tkd.rootTask(3)

would return the value of the root `.launch()` task. If `tkd` was in the scope of the example functions, then `FuncB` could adjust the duration of `FuncC` by something like this:

	tkd.rootTask().setDuration(5000);

Likewise, `.chainedTask()` peers "forward" along the list of chained tasks. In additional to a levels-away count, you can also add an optional index to select a specific chained task if the parent has multiple parallel chains. You can get as complicated or simple as you feel.

### WrapUp Functions

When a task has a WrapupFunc defined, the WrapUp will execute *once* on the next animation frame after the task completes. It will also execute before any chained task begins.

### Halting Tasks and Manager Cleaning

You can halt tasks a few ways. Tasks that return `true` will halt themselves, but on occasion you may need to halt them from another part of your code, say in response to an event.

If you have a task "Tk" running on AnimTaskMgr "ATM," you could halt it any of these canonical ways:

	Tk.halt();					// typical
	Tk.chain(function() {});	// for infinite tasks with a wrapup function
	ATM.discard(Tk);			// "hard stop": don't execute any wrapup or chain functions

Typically after every frame, the AnimTaskManager will discard any halted or expired tasks. If you set `ATM.selfCleaning` to `false`, you will have to call `ATM.autoClean()` yourself from time to time. This can sometimes be more efficient if there are *lots* of regular task changes.

## A Word on Synchronization

Tasks that launch together may not *always* complete together, depending on externalities -- interupts, other tasks that take too long and push their neighbors into the next frame, etc. If you need close synchromization -- if the result of some task depends upon some other task that's not directly in its own chain -- you'll need to apply the same sorts of strategies you would with any other sort of asychronous web process, because that's really what tasks are.

## The Time Limit

60 frames per second animation means frame times of around 16 milliseconds each. By default, AnimTaskMgr restricts its activities to 12ms (a really long task can mess this up). This leaves you enough headroom to do other tings, like, oh, actually draw the page. Some counsel for even tighter limits: as little as 6ms. Or maybe you don't mind running at a low rate if the correctness is right. You can change the limit for AnimTaskMgr: use `.setTimeLimit()` and set it to the desired limit, in millseconds.

Note: making the limit shorter won't speed up your animation if you're already running at 60fps -- all present-day browsers are limited to that rate.

## Interpolators

Details coming soon, promise. Any function that takes a 0-1 value and returns a similar value will work! You can also apply Tween.js interpolators.

### Interpolator Inheritance

As mentioned earlier, if you don't specify an interpolator for a `.chain()` task, it will inherit the interpolator of its immediate parent task. This lets you set the interpolate once at the start and keep consistency throughout.

You can also set a default interpolator for the AnimTaskMgr itself, by using the `.defaultInterpolator()` method. All new tasks added via `.launch()` that don't specify an interpolator will inherit the default you specify.

### Why not use Tween.js or Web Workers or (insert package name) instead of AnimTaskMgr?

AnimTaskMgr cam out of a desire to provide a way to trigger events based on any kind of timing: frame counting, elapsed time, time per frame, etc. You can use Tween.js's update() for some of this, but you carry all the baggage of Tween's parameter update mechanism, which I didn't need. Six of one, half-dozen of the other. I like Tween.js too, sometimes.

