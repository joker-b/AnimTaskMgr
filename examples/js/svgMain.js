// svgMain.js

'use strict';

var ATM = new AnimTaskMgr();

var con = document.getElementById('svgMain');

function Bounce(SvgDoc,Parent)
{
	this.shape = SvgDoc.createElementNS(svgns, 'circle');
	this.pts = [];
	for (var i=0; i<4; i+=1) {
		this.pts.push({
			x: Math.random() * 600,
			y: Math.random() * 400
		});
	}
	this.radius = 20;
	this.col = 0x7f7f7f + Math.floor(Math.random() * 0x808080);
	this.animate(0);
	Parent.appendChild(this.shape);
	this.adjDrawSettings();
}
Bounce.prototype.animate = function(T) {
	var iT = 1.0 - T;
	var T2 = T * T;
	var iT2 = iT * iT;
	var p = [T*T2, iT*T2, iT2*T, iT*iT2];
	this.cx = 0;
	this.cy = 0;
	for (var i=0; i<4; i+=1) {
		this.cx += p[i]*this.pts[i].x;
		this.cy += p[i]*this.pts[i].y;
	}
	this.adjDrawSettings();
};
Bounce.prototype.animTask = function(Clock) {
	this.animate(Clock.relative);
};
Bounce.prototype.launchAnim = function(ATMgr) {
	var bnc = this;
	ATMgr.launch(function(Clock) {bnc.animate(Clock.relative)},null,Math.floor(20000+Math.random()*5000));
};
Bounce.prototype.adjDrawSettings = function() {
	this.shape.setAttributeNS(null, 'cx', this.cx);
	this.shape.setAttributeNS(null, 'cy', this.cy);
	this.shape.setAttributeNS(null, 'r',  this.radius);
	this.shape.setAttributeNS(null, 'fill', ('#'+this.col.toString(16)));
};

var svgns = 'http://www.w3.org/2000/svg';
var svgDocument = document;
var svg = svgDocument.createElementNS(svgns, 'svg');
svg.setAttributeNS(null, 'width', 600);
svg.setAttributeNS(null, 'height', 400);
con.appendChild(svg);
for (var i=0; i<20; i+=1) {
	var b = new Bounce(svgDocument,svg);
	b.launchAnim(ATM);
}

function animate() {
	requestAnimationFrame(animate);
	ATM.animate();
}

animate();