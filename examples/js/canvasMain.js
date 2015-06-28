//
// canvasMain.js
//

'use strict';

var ATM = new AnimTaskMgr();

var cv = document.getElementById('cvMain');

var ctx = cv.getContext('2d');
ctx.fillStyle = 'rgb(200,0,0)';  
ctx.fillRect(10, 10, 55, 50);
function voila(TimeNow,RelativeTime,SinceLastFrameTime,SinceStartTime,Count) {
	var rc = "rgb("+((Count%50)*5)+",30,40)";
	// console.log(rc);
	ctx.fillStyle = "#ffff9f";
	ctx.fillRect(0,0, 500, 400);
	ctx.fillStyle = rc;
	var r = Count/40;
	var nx = Math.random() * Math.random();
	ctx.fillRect(200 + 160*Math.cos(r)-8*nx, 180 + 160*Math.sin(r)-8*nx, 50+16*nx, 50+16*nx);
}

ATM.launch(voila,null,0.0);

function animate() {
	requestAnimationFrame(animate);
	ATM.animate();
}

animate();

