//
// canvasMain.js
//

'use strict';

var ATM = new AnimTaskMgr();

var cv = document.getElementById('cvMain');
var ctx = cv.getContext('2d');


function Orbitter(Ctx,cx,cy,A,BigR,InR,Speed,Alpha,Parent,KidLife) {
	this.ctx = Ctx;  // context
	this.cx = cx;
	this.cy = cy;
	this.startAngle = A;
	/* var hue = Math.floor(180*A/(2*Math.PI));
	hue = (hue>360) ? (hue-360) : hue; */
	var hue = Math.floor( 0.5 + Math.random() * 360);
	var sat = (1 - BigR/200); // note constant
	sat = Math.floor(100*Math.min(1,Math.max(0,sat)));
	this.color = 'hsl('+hue+','+sat+'%,80%)';
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

Orbitter.prototype.setPos = function() {
	this.px = this.cx + this.bigR*Math.cos(this.angle);
	this.py = this.cy + this.bigR*Math.sin(this.angle);
};

Orbitter.prototype.draw = function() {// graphics context
	var nx = Math.random() * Math.random();
	this.ctx.globalAlpha  = this.alpha;
	this.ctx.fillStyle = this.color;
	this.ctx.beginPath();
	this.ctx.arc(this.px, this.py, this.inR+(this.rVar*nx), 0, 2*Math.PI);
	this.ctx.closePath();
	this.ctx.fill();
	if (this.parent) {
		this.ctx.strokeStyle = this.color;
		this.ctx.beginPath();
		this.ctx.moveTo(this.px,this.py);
		this.ctx.lineTo(this.parent.px,this.parent.py);
		this.ctx.stroke();
	}
};
Orbitter.prototype.animate = function(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
	this.angle = this.startAngle + this.speed*SinceStartTime;
	//this.color = 'rgb('+((Count%50)*5)+',30,40)';
	//this.setPos();
	this.px = this.cx + this.bigR*Math.cos(this.angle);
	this.py = this.cy + this.bigR*Math.sin(this.angle);
	this.draw();
	if (Math.random() < 0.6) {
		this.spawn();
	}
};
Orbitter.prototype.spawn = function() {
	var nbr = ((Math.random()*0.5)+0.5) * this.bigR * 0.75;
	if (nbr<(this.rVar+1)) return; // too small
	var d = Math.random() * this.kidLife + 500;
	var ns = this.speed * this.bigR / nbr;
	var na = Math.random() * 2 * Math.PI;

	var nob = new Orbitter(this.ctx,
							this.px+nbr*Math.cos(na),
							this.py+nbr*Math.sin(na),
							na+Math.PI, nbr,this.inR*0.5, -ns, this.alpha * 0.75,
							this, this.kidLife * 0.7);
	nob.launch(d);
};
Orbitter.prototype.launch = function(Duration) {
	var orb = this;
	function animate(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
		orb.angle = orb.startAngle + orb.speed*SinceStartTime;
		// orb.color = 'rgb('+((255-Count%50))+',170,240)';
		orb.setPos();
		orb.draw();
		if (Math.random() < 0.025) {
			orb.spawn();
		}
	}
	ATM.launch(animate,null,Duration);
};

var dad = new Orbitter(ctx,400,300, 0.0, 200,10, 0.0004, 1.0, null, 3500);
dad.launch(0); // dad is immortal

function animate() {
	requestAnimationFrame(animate);
	ctx.fillStyle = "#000";
	ctx.globalAlpha = 0.06;
	ctx.fillRect(0,0,800,600);
	ATM.animate();
}

animate();

