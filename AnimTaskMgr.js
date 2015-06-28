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
function ATask(AnimFunc,WrapUpFunc,Duration,Interp,Parent) { // WrapUp is optional
	this.start = Date.now();
	this.prev = this.start;
	this.count = 0;
	this.animFunc = AnimFunc || null;
	this.wrapFunc = WrapUpFunc || null;
	this.duration = Duration || 0.0; // duration <=0 lasts until halted. otherwise, in milliseconds
	this.interp = Interp || null; // Interp - function taks value returns 0-1
	this.parent = Parent;
	this.active = true;
	this.wrapReady = false;
	this.chainTask = null;
}

ATask.prototype.animate = function() {
	if (!this.active) {
		return;
	}
	var t, ti, haltMe;
	var now = Date.now();
	var totalTime = now - this.start;
	var frameTime = now - this.prev;
	this.prev = now;
	if (this.duration>0) {
		t = totalTime/this.duration;
	} else {
		t = 0.0; // for now
	}
	if ((this.interp !== undefined)&&(this.interp)) {
		ti = this.interp(t); // sloin, gamma, etc.
	} else {
		ti = t;
	}
	if (this.wrapReady) {
		if (this.wrapFunc) {
			this.wrapFunc(now,ti,frameTime,totalTime,this.count);
		}
		this.wrapReady = false;
		this.wrapFunc = null;
		this._halt();
		return;
	}
	if (this.animFunc) {
		haltMe = this.animFunc(now,ti,frameTime,totalTime,this.count);
	} else {
		haltMe = false;
	}
	this.count += 1;
	if ( (t >= 1.0) || (haltMe === true) ) {
		this._halt();
	}
};

ATask.prototype.chain = function(AnimFunc,WrapUpFunc,Duration,Interp) {
	this.chainTask = new ATask(AnimFunc,WrapUpFunc,Duration,Interp,this.parent);
	return this.chainTask;
};

ATask.prototype._halt = function() {
	if (this.wrapFunc) {  // if there's a wrapFunc to that first
		this.wrapReady = true; // execute wrapFunc on next ieration
		return;
	} 
	this.active = false;  // otherwise halt immediately
	if (this.chainTask) {
		this.parent.addChainTask(this.chainTask); // TODO how to deal with params?????
	}
};

ATask.prototype.halt = function() {
	this.chainTask = null; // kill any chained task(s)
	this._halt();
};

//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////

function AnimTaskMgr() {
	this.tasks = [];
	this.chainList = [];
	this.N = 0;
	this.limit = 12; // 12 ms
	this.selfCleaning = true;
	//
	this._t = 0;
	this._I = 0; 
}

AnimTaskMgr.prototype.addTask = function(Tk) {
	this.tasks.push(Tk);
	return Tk; // return the new tasks in case the clinet wants to mess with it
};

AnimTaskMgr.prototype.addChainTask = function(Tk) {
	// chained tasks go into this list so that they don't execute until NEXT frame
	this.chainList.push(Tk); // nothin returned
};

AnimTaskMgr.prototype.launch = function(AnimFunc,WrapUpFunc,Duration,Interp) {
	return this.addTask(new ATask(AnimFunc,WrapUpFunc,Duration,Interp,this));
};

AnimTaskMgr.prototype.halt = function(TK) {
	// should we execute the wrapup function?
	this._I = this.tasks.indexOf(TK);
	if (this._I<0) {
		return false; // oops
	}
	this.tasks.splice(this._I,1); // remove
	if (this.N > this._I) { // adjust our N counter if its target has moved
		this.N -= 1;
	}
	return true;	// success
};

AnimTaskMgr.prototype.animate = function() {
	this._t = Date.now();
	for (this._I=0; this._I<this.tasks.length; this._I+=1) {
		if ((Date.now()-this._t) > this.limit) {
			return;
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
	var pad = this.tasks.slice(0);
	for (var i=0; i<pad.length; i+=1) {
		if (!pad[i].active) {
			this.halt(pad[i]);
		}
	}
};

/////////////////// eof ///

