//
// AnimTaskMgr.js
//
// Kevin Bjorke 2015
//

// Functions:
// AnimFunc(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count)
//		returns true or false -- true if it wants to halt itself
//				-- wrapup will still fire on next animationframe
//		"RelativeTime" means in the range 0-1
//		All other times in milliseconds
//		"Count" = # of times this has been executed, with zero as the first time
// WrapUpFunc(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count)
//		no return value
//		no nead for relative (0-1) time -- it's assumed to be 1
// Interp -- taks 0-1 emits an interpolated value (usually 0-1 but not required)
//		-- interpolators from Tween.js etc ca be used too.

'use strict';

//
// Because ATask objects should only be created by the AnimTaskMgr launch() method,
//		we can make some pretty safe assumptions about validitiy of data, thus saving
//		execution time by skipping error-checking.
//

function ATClock(Duration,Interp)
{
	this.now = Date.now();
	this.count = 0;
	this._reset();
	this._t = 0;
	this.duration = Duration || 0.0; // duration <=0 lasts until halted. otherwise, in milliseconds
	this.interp = Interp || null; // Interp - function taks value returns 0-1
	this.prev = this.start;
	this.totalTime = 0;
	this.frameTime = 0;
	this.relative = 0;
}
ATClock.prototype._reset = function() {
	this.start = this._now;
	this.prev = this.start;
};
ATClock.prototype.tick = function()
{
	this._now = Date.now();
	if (this.count === 0) {
		this._reset();
	}
	this.sinceStart = this._now - this.start;
	this.sinceLastFrame = this._now - this.prev;
	this._t = (this.duration>0) ? (this.sinceStart/this.duration) : 0.0;
	this._t = Math.min(1.0,this._t);								// don't overshoot
	this.relative = (this.interp) ? this.interp(this._t) : this._t; // though interpolators can
};
ATClock.prototype.tock = function()
{
	this.prev = this._now;
	this.count += 1;
	return (this._t >= 1);  // duration has been reached
};

////////////////////////////////////////////////////////

function ATask(AnimFunc,WrapUpFunc,Duration,Interp,Manager,Root) { // WrapUp is optional
	this.clock = new ATClock(Duration,Interp);
	this.animFunc = AnimFunc || null;
	this.wrapFunc = WrapUpFunc || null;
	this.mgr = Manager;
	this.active = true;
	this.wrapReady = false;
	this.chainTasks = [];
	this.chainRoot = Root || null;
}

ATask.prototype.animate = function() {
	if (!this.active) {
		return;
	}
	var haltMe;
	this.clock.tick();
	//if (this.clock.count == 0) {
	//	console.log(this.clock.sinceStart);
	//}
	if (this.wrapReady) {
		if (this.wrapFunc) {
			this.wrapFunc(this.clock);
		}
		this.wrapReady = false;
		this.wrapFunc = null;
		this._halt();
		return;
	}
	if (this.animFunc) {
		haltMe = this.animFunc(this.clock);
	} else {
		haltMe = false;
	}
	if ( (this.clock.tock()) || (haltMe === true) ) {
		this._halt();
	}
};

ATask.prototype.chain = function(AnimFunc,WrapUpFunc,Duration,Interp) {
	var terp = Interp || this.clock.interp;
	var chTk = new ATask(AnimFunc,WrapUpFunc,Duration,terp,this.mgr,this);
	this.chainTasks.push(chTk);
	return chTk;
};

ATask.prototype.chainedTask = function(Levels,Item) {
	var i, c, levels = Levels | 1, item = Item || 0;
	c = this;
	for (i=0; i<levels; i+=1) {
		if (c.chainTasks.length<1) {
			break;
		}
		c = c.chainTasks[item];
	}
	return c;
};

ATask.prototype.rootTask = function(Levels) {
	var i, c, levels = Levels | 1;
	c = this;
	for (i=0; i<levels; i+=1) {
		if (!c.chainRoot) {
			break;
		}
		c = c.chainRoot;
	}
	return c;
};

ATask.prototype.setDuration = function(Duration) {
	var d = Duration || 0;
	this.clock.duration = d;
};

ATask.prototype.setInterp = function(Interp) {
	this.clock.interp = Interp;
};

ATask.prototype._halt = function() {
	if (this.wrapFunc) {  // if there's a wrapFunc to that first
		this.wrapReady = true; // execute wrapFunc on next ieration
		return;
	} 
	this.active = false;  // otherwise halt immediately
	for (var i=0; i<this.chainTasks.length; i+=1) {
		this.mgr.addChainTask(this.chainTasks[i]);
	}
};

ATask.prototype.halt = function() {
	this.chainTasks = []; // kill any chained task(s)
	this._halt();
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function AnimTaskMgr() {
	this.tasks = [];
	this.chainList = [];
}
AnimTaskMgr.prototype._t = 0;
AnimTaskMgr.prototype._I = 0;
AnimTaskMgr.prototype.defInterp = null;
AnimTaskMgr.prototype.selfCleaning = true;
AnimTaskMgr.prototype.limit = 12;
AnimTaskMgr.prototype.N = 0;
AnimTaskMgr.prototype.paused = false;

AnimTaskMgr.prototype.pause = function() {
	this.paused = true;
};
AnimTaskMgr.prototype.resume = function() {
	this.paused = true;
};

AnimTaskMgr.prototype.setTimeLimit = function(T) {
	if (T !== undefined && T > 0) {
		this.limit = T;
	}
	return this.limit;
};

AnimTaskMgr.prototype.addTask = function(Tk) {
	this.tasks.push(Tk);
	return Tk; // return the new tasks in case the clinet wants to mess with it
};

AnimTaskMgr.prototype.addChainTask = function(Tk) {
	// chained tasks go into this list so that they don't execute until NEXT frame
	this.chainList.push(Tk); // nothin returned
};

AnimTaskMgr.prototype.launch = function(AnimFunc,WrapUpFunc,Duration,Interp) {
	var terp = Interp || this.defInterp;
	return this.addTask(new ATask(AnimFunc,WrapUpFunc,Duration,terp,this));
};

AnimTaskMgr.prototype.defaultInterpolator = function(Interp) {
	if (Interp !== undefined) {
		this.defInterp = Interp;
	}
	return this.defInterp;
};

AnimTaskMgr.prototype._discard = function(TK) {
	this.tasks.splice(this._I,1); // remove
	if (this.N > this._I) { // adjust our N counter if its target has moved
		this.N -= 1;
	}
};

AnimTaskMgr.prototype.discard = function(TK) {
	// removes immediately, which means the task, wrapup, and chain
	this._I = this.tasks.indexOf(TK);
	if (this._I<0) {
		return false; // oops
	}
	this._discard(TK);
	return true;	// success
};

AnimTaskMgr.prototype.animate = function() {
	if (this.paused) {
		return;
	}
	this._t = Date.now();
	for (this._I=0; this._I<this.tasks.length; this._I+=1) {
		if ((Date.now()-this._t) > this.limit) {
			break;
		}
		if (this.N >= this.tasks.length) {
			this.N = 0;
		}
		this.tasks[this.N].animate();
		this.N += 1;
	}
	if (this.selfCleaning) {
		this.autoClean();
	}
	// now add any pending chained tasks
	for (this._I=0; this._I<this.chainList.length; this._I+=1) {
		this.addTask(this.chainList[this._I]);
	}
	this.chainList.splice(0);
};

AnimTaskMgr.prototype.autoClean = function() {
	var scratch = [];
	for (var i=0; i<this.tasks.length; i+=1) {
		if (this.tasks[i].active) {
			scratch.push(this.tasks[i]);
		}
	}
	this.tasks = scratch;
};

/////////////////// eof ///

