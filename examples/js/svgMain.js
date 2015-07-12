// svgMain.js

'use strict';

var ATM = new AnimTaskMgr();

var svgns = 'http://www.w3.org/2000/svg';
var con = document.getElementById('svgMain');

function smoothstep(edge0,edge1,x) {
	var t = Math.min(Math.max( ((x - edge0)/ (edge1 - edge0)), 0.0), 1.0);
	return t * t * (3.0 - 2.0 * t);
}

function Bounce(Svg)
{
	this.pts = [];
	for (var i=0; i<4; i+=1) {
		this.pts.push({
			x: Math.floor(Math.random() * 600),
			y: Math.floor(Math.random() * 400)
		});
	}
	this.radius = 20;
	this.nRed = 0x10 + Math.floor(Math.random()*0xdf);
	this.nGreen = 0x10 + Math.floor(Math.random()*0xdf);
	this.nBlue = 0x10 + Math.floor(Math.random()*0xdf);
	this.red = 0;
	this.green = 0;
	this.blue = 0;
	this.col = this.colorString();
	//console.log(this.col);
	this.debugLines = Svg.polyline(
		this.pts[0].x, this.pts[0].y,
		this.pts[1].x, this.pts[1].y,
		this.pts[2].x, this.pts[2].y,
		this.pts[3].x, this.pts[3].y
		);
	this.mainShape = Svg.circle(this.pts[0].x,this.pts[0].y,this.radius);
	this.animate(0);
	this.adjDrawSettings();
	//Parent.appendChild(this.mainShape);
	//Parent.appendChild(this.debugLines);
};
Bounce.prototype.animate = function(T) {
	var t = Math.max(0.0,Math.min(T,1.0) );
	var iT = 1.0 - t;
	var T2 = t * t;
	var iT2 = iT * iT;
	var p = [t*T2, 3*iT*T2, 3*iT2*t, iT*iT2]; // bezier
	this.cx = 0;
	this.cy = 0;
	for (var i=0; i<4; i+=1) {
		this.cx += p[i]*this.pts[i].x;
		this.cy += p[i]*this.pts[i].y;
	}
	var fade = 0.1;
	var brite = smoothstep(0,fade,t) * (1-smoothstep((1-fade),1,t));
	this.red = this.nRed * brite;
	this.green = this.nGreen * brite;
	this.blue = this.nBlue * brite;
	this.col = this.colorString();
	// if (brite != 1) {
	//	console.log(brite+','+t+', '+this.col);
	// }
	this.adjDrawSettings();
};
Bounce.prototype.launchAnim = function() {
	var temp = [this.pts[0].x, this.pts[0].y];
	this.pts[0].x = this.pts[3].x;
	this.pts[0].y = this.pts[3].y;
	this.pts[3].x = temp[0];
	this.pts[3].y = temp[1];
	ATM.launch(
		function(Clock) {this.animate(Clock.relative);}.bind(this),
		function(Clock) {this.launchAnim(ATM);}.bind(this),
		Math.floor(1000+Math.random()*2000));
};
Bounce.prototype.colorString = function(R,G,B) {
	var r = R || this.red;
	var g = G || this.green;
	var b = B || this.blue;
	r = Math.max(0,Math.min(Math.floor(r),0xff));
	g = Math.max(0,Math.min(Math.floor(g),0xff));
	b = Math.max(0,Math.min(Math.floor(b),0xff));
	var c = r * 0x10000 + g * 0x100 + b;
	return ('#'+c.toString(16));
};
Bounce.prototype.adjDrawSettings = function() {
	var p = [];
	for (var i=0; i<4; i+=1) {
		p.push(this.pts[i].x);
		p.push(this.pts[i].y);
	}
	this.debugLines.attr({
		'fill': 'none',
		'stroke-width': 1,
		'stroke': this.col,
		'points': p
	});
	this.mainShape.attr({
		'cx': this.cx,
		'cy': this.cy,
		'r':  this.radius,
		'fill': this.col,
	});
};

var svg = Snap('#svgATM');
//con.appendChild(svg);
for (var i=0; i<8; i+=1) {
	var b = new Bounce(svg);
	b.launchAnim();
}

function animate() {
	requestAnimationFrame(animate);
	ATM.animate();
}

animate();