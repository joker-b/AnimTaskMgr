//
// pathfinder
//

'use strict';

var scene, camera, renderer, ATM, maze, mark, s1, s2;


function onWindowResize( event ) {
    //windowHalfX = window.innerWidth / 2;
    //windowHalfY = window.innerHeight / 2;
    var WIDTH = window.innerWidth;
    var HEIGHT = window.innerHeight;
    renderer.setSize( WIDTH, HEIGHT );
    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
}

function mazeBuild(Clock)
{
	if (maze === undefined) {
		maze = new Maze(scene);
	}
	maze.init();
	console.log('maze size '+maze.nodeList.length);
	return true;
}
function mazeDisks(Clock)
{
	if (Clock.count >= maze.nodeList.length) {
		console.log('lines drawn for '+Clock.count);
		return true;
	}
	maze.nodeList[Clock.count].obj3d(maze.obj3d);
}
function mazeNeighbors(Clock)
{
	if (Clock.count >= maze.nodeList.length) {
		console.log('neighbors done: '+Clock.count);
		return true;
	}
	var nCount = Math.floor(Math.random()*3 + 2.1); // neighbor count
	maze.nearest2D(maze.nodeList[Clock.count], nCount);
}
function mazeUpNeighbors(Clock)
{
	if (Clock.count >= (maze.nFloors-1)) {
		console.log('floors done: '+Clock.count+' of '+maze.nFloors);
		return true;
	}
	maze.nearestFloor(Clock.count);
};

function mazeLines(Clock)
{
	if (Clock.count >= maze.nodeList.length) {
		console.log('lines drawn for '+Clock.count);
		return true;
	}
	maze.nodeList[Clock.count].drawEdges(maze.obj3d);
}
function mazeG(Clock)
{
	maze.makeGraph();
	console.log('graph built');
	return true;
}

function mazePaths(Clock)
{
	var path = null;
	var srcNode = maze.randNode(), destNode;
	var perLink = 300;
	var rampTime = 900;
	var vec = new THREE.Vector3();
    var reptCt = 0;
    function choosePath(Clock) {
    	path = null;
		while (path === null) {
	    	destNode = srcNode;
			while (destNode === srcNode) {
				destNode = maze.randNode();
			}
			path = maze.path(srcNode,destNode);
			//console.log(path);
		}
		// path = [srcNode].concat(path);
		mark.position.copy(maze.nodes[srcNode].pos);
		s1.position.copy(maze.nodes[srcNode].pos);
		s2.position.copy(maze.nodes[destNode].pos);
	    s1.visible = true;
	    s2.visible = true;
		return true;
	}
	function rampUp(Clock) {
		vec.copy(maze.nodes[destNode].pos);
		vec.sub(maze.nodes[srcNode].pos);
		vec.multiplyScalar(Clock.relative);
		vec.add(maze.nodes[srcNode].pos);
		s2.position.copy(vec);
		s1.position.copy(maze.nodes[srcNode].pos);
		mark.position.copy(maze.nodes[srcNode].pos);
		s1.material.opacity = Clock.relative;
		s2.material.opacity = Clock.relative;
	}
	function rampDown(Clock) {
		s1.material.opacity = 1 - Clock.relative;
		s2.material.opacity = 1 - Clock.relative;
		srcNode = destNode;
	}
	function traversePath(Clock) {
		var px = Clock.sinceStart/perLink;
		var nLink = Math.floor(px);
		if (nLink >= (path.length-1)) {
			//console.log("done");
			return true;
		}
		var frac = px - nLink;
		var pLink = nLink+1;
		var p1 = path[nLink];
		var p2 = path[pLink];
		var n1 = maze.nodes[p1];
		var n2 = maze.nodes[p2];
		vec.copy(n2.pos);
		vec.sub(n1.pos);
		vec.multiplyScalar(frac);
		vec.add(n1.pos);
		//console.log(vec);
		mark.visible = true;
		mark.position.copy(vec);
	}
	function rept(Clock) {
		//console.log('repeat');
		if (reptCt < 4) {
			ATM.launch(choosePath).
				chain(rampUp,null,rampTime).
				chain(traversePath).
				chain(rampDown,null,rampTime).
				chain(rept);
		} else {
			mark.visible = false;
			mazeLoop();
		}
		reptCt += 1;
		return true;
	}
	ATM.launch(choosePath).
		chain(rampUp,null,rampTime).
		chain(traversePath).
		chain(rampDown,null,rampTime).
		chain(rept);
}

function mazeLoop()
{
	if (maze !== undefined) {
		scene.remove(maze.obj3d);
		maze = undefined;
	}
    ATM.launch(mazeBuild).
    		chain(mazeDisks).
    		chain(mazeNeighbors).
    		chain(mazeUpNeighbors).
    		chain(mazeLines).
    		chain(mazeG,mazePaths);

}
function init()
{
	ATM = new AnimTaskMgr();
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2( 0x000000, 0.0125 );
    camera = new THREE.PerspectiveCamera( 55, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.set(10,27,27);
    camera.lookAt(new THREE.Vector3(0,0,0));
    camera.name = 'camera';
    var control = new THREE.OrbitControls(camera);
    mark = new THREE.Mesh(new THREE.SphereGeometry(1),new THREE.MeshBasicMaterial( {color:0xff2222, wireframe:true} ));
    mark.visible = false;
    s1 = new THREE.Mesh(new THREE.SphereGeometry(0.5),new THREE.MeshBasicMaterial( {transparent:true,color:0x22ff22, wireframe:true} ));
    s1.visible = false;
	s1.material.opacity=0.0;
	s2 = new THREE.Mesh(new THREE.SphereGeometry(0.5),new THREE.MeshBasicMaterial( {transparent:true,color:0x2222ff, wireframe:true} ));
    s2.visible = false;
    s2.material.opacity=0.0;
    scene.add(mark);
    scene.add(s1);
    scene.add(s2);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
    mazeLoop();
}

function animate()
{
    requestAnimationFrame( animate );
    ATM.animate();
    renderer.render( scene, camera );
}

init();
animate();

