// svgMain.js

'use strict';

var ATM = new AnimTaskMgr();

var con = document.getElementById('svgMain');

function Bounce(SvgDoc,Parent)
{
	this.shape = SvgDoc.createElementNS(svgns, 'circle');
	this.sx = Math.random() * 600;
	this.sy = Math.random() * 400;
	this.dx = Math.random() * 600;
	this.dy = Math.random() * 400;
	this.radius = 20;
	this.col = 0x7f7f7f + Math.floor(Math.random() * 0x808080);
	this.animate(0);
	Parent.appendChild(this.shape);
	this.adjDrawSettings();
}
Bounce.prototype.animate = function(T) {
	this.cx = this.sx + T * (this.dx-this.sx);
	this.cy = this.sy + T * (this.dy-this.sy);
	this.adjDrawSettings();
};
Bounce.prototype.animTask = function(Clock) {
	this.animate(Clock.relative);
};
Bounce.prototype.launchAnim = function(ATMgr) {
	var bnc = this;
	ATMgr.launch(function(Clock) {bnc.animate(Clock.relative)},null,2000);
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