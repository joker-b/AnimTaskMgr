//
// canvasMain.js
//

'use strict';

var ATM = new AnimTaskMgr();

var cv = document.getElementById('cvMain');
var ctx = cv.getContext('2d');


function Orb(Ctx,cx,cy,A,BigR,InR,Speed,Alpha,Parent,KidLife,ParentAngle) {
	this.ctx = Ctx;  // context
	this.cx = cx;
	this.cy = cy;
	this.startAngle = A;
	/* var hue = Math.floor(180*A/(2*Math.PI));
	hue = (hue>360) ? (hue-360) : hue; */
	var a = ParentAngle/(2*Math.PI);
	a = a - Math.floor(a);
	this.hue = Math.floor(a * 360);
	this.sat = (1 - BigR/200); // note constant
	this.sat = Math.floor(100*Math.min(1,Math.max(0,this.sat)));
	this.color = 'hsl('+this.hue+','+this.sat+'%,70%)';
	//console.log(this.color);
	this.angle = 0.0;
	this.speed = Speed;
	this.alpha = Alpha;
	this.bigR = BigR;
	this.inR = InR;
	this.rVar = 6; // variance of r
	this.parent = Parent;
	this.kidLife = KidLife;
}

Orb.prototype.setPos = function() {
	this.px = this.cx + this.bigR*Math.cos(this.angle);
	this.py = this.cy + this.bigR*Math.sin(this.angle);
};

Orb.prototype.draw = function() {// graphics context
	var nx = 0.5; // Math.random() * Math.random();
	this.ctx.globalAlpha  = this.alpha;
	this.ctx.fillStyle = this.color;
	this.ctx.beginPath();
	this.ctx.arc(this.px, this.py, this.inR+(this.rVar*nx), 0, 2*Math.PI);
	this.ctx.closePath();
	this.ctx.fill();
	if (this.parent) {
		var dx = this.px-this.parent.px;
		var dy = this.py-this.parent.py;
		var d = 8000.0 / (dx*dx+dy*dy);
		d = (d>1.0) ? 1.0 : d;
		this.ctx.globalAlpha  = d * this.alpha;
		this.ctx.strokeStyle = this.color;
		this.ctx.beginPath();
		this.ctx.moveTo(this.px,this.py);
		this.ctx.lineTo(this.parent.px,this.parent.py);
		this.ctx.stroke();
	}
};
Orb.prototype.spawn = function() {
	var nbr = ((Math.random()*0.5)+0.5) * this.bigR * 0.75;
	if (nbr<(this.rVar+1)) { return; }// too small
	var d = Math.random() * this.kidLife + 500;
	var ns = this.speed * this.bigR / nbr;
	var na = Math.random() * 2 * Math.PI;

	var nob = new Orb(this.ctx,
							this.px+nbr*Math.cos(na),
							this.py+nbr*Math.sin(na),
							na+Math.PI, nbr,this.inR*0.5, -ns, this.alpha * 0.75,
							this, this.kidLife * 0.7, this.angle);
	nob.launch(d);
};
Orb.prototype.launch = function(Duration) {
	var orb = this;
	function animate(Clock) {
		orb.angle = orb.startAngle + orb.speed*Clock.sinceStart;
		var L = Math.floor(90*(1 - Clock.relative));
		orb.color = 'hsl('+orb.hue+','+orb.sat+'%,'+L+'%)';
		orb.setPos();
		orb.draw();
		if (Math.random() < 0.025) {
			orb.spawn();
		}
	}
	ATM.launch(animate,null,Duration);
};

var dad = new Orb(ctx,400,300, 0.0, 200,10, 0.0004, 1.0, null, 3500, 0);
dad.launch(0); // dad is immortal

var gAlpha = 0.05;
ATM.launch(function animate(Clock) {
	gAlpha = 0.055+ 0.05*Math.sin(Clock.sinceStart*0.00016);
},null,0);

function animate() {
	requestAnimationFrame(animate);
	ctx.fillStyle = "#000";
	ctx.globalAlpha = gAlpha;
	ctx.fillRect(0,0,800,600);
	ATM.animate();
}

animate();

