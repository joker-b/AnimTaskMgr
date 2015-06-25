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

// TODO should there be a startup too???

'use strict';

function ATTask(AnimFunc,WrapUpFunc,Duration,Interp) { // WrapUp is optional
	this.start = Date.now();
	this.prev = this.start;
	this.count = 0;
	this.animFunc = AnimFunc;
	this.wrapFunc = WrapUpFunc;
	this.duration = Duration || 0.0; // duration <=0 lasts until halted. otherwise, in milliseconds
	this.interp = Interp; // Interp - function taks value returns 0-1
	this.active = true;
	this.wrapReady = false;
}

ATTask.prototype.animate = function() {
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
		if ((this.wrapFunc !== undefined)&&(this.wrapFunc)) {
			this.wrapFunc(now,ti,frameTime,totalTime,this.count);
		}
		this.active = false;
		return;
	}
	haltMe = this.animFunc(now,ti,frameTime,totalTime,this.count);
	this.count += 1;
	if ( (t >= 1.0) || (haltMe === true) ) {
		if ((this.wrapFunc !== undefined)&&(this.wrapFunc)) {
			this.wrapReady = true; // execute wrapFunc on next ieration
		} else {
			this.active = false;  // otherwise halt immediately
		}
	}
};

///////////

function AnimTaskMgr() {
	this.tasks = [];
	this.N = 0;
	this.limit = 12; // 12 ms
	this.selfCleaning = true;
	//
	this._t = 0;
}

AnimTaskMgr.prototype.launch = function(AnimFunc,WrapUpFunc,Duration,Interp) {
	var tk = new ATTask(AnimFunc,WrapUpFunc,Duration);
	this.tasks.push(tk);
	return tk; // return the new tasks in case the clinet wants to mess with it
};

AnimTaskMgr.prototype.halt = function(TK) {
	// should we execute the wrapup function?
	var i = this.tasks.indexOf(TK);
	if (i<0) {
		return false; // oops
	}
	this.tasks.splice(i,1); // remove
	if (this.N > i) { // adjust our N counter if its target has moved
		this.N -= 1;
	}
	return true;	// success
};

AnimTaskMgr.prototype.animate = function() {
	this._t = Date.now();
	for (var i=0; i<this.tasks.length; i+=1) {
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

