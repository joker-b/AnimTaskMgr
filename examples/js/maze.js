//
// Path Maze
// 
'use strict';

function MNode(UniqueName,Floor) {
	this.name = UniqueName;	// names should all be unique
	this.floor = Floor;
	this.pos = new THREE.Vector3( );
	this.edges = {};
	this.obj = null;
	this.edgeLines = null;
	//
	this._dd = 0; // use for scratchpad when doing distance calculations
}

MNode.prototype.addEdge = function(Neighbor,Distance) { // "Neighbor" is also an MNode
	if (this.edges.Neighbor === undefined) {
		this.edges[Neighbor.name] = { d: Distance, node: Neighbor};
		Neighbor.edges[this.name] = { d: Distance, node: this};
		//console.log('Edge '+this.name+' -> '+Neighbor.name);
	} else {
		console.log('Already have and edge from '+this.name+' to '+Neighbor.name);
	}
};

MNode.prototype.drawEdges = function(Scene) {
	var i, n;
	var geo = new THREE.Geometry();
	for (i in this.edges) {
		n = this.edges[i].node;
		// console.log(this.edges[i]);
		geo.vertices.push ( this.pos.clone() );
		geo.vertices.push ( n.pos.clone() );
	}
	var floorCol = [0x9f4510,0x407010,0x471860];
	this.edgeLines = new THREE.Line( geo, 
							new THREE.LineBasicMaterial( {color: floorCol[this.floor]} ),
							THREE.LinePieces );
	Scene.add(this.edgeLines);
};

MNode.prototype.distSq = function(Neighbor) {
	return this.pos.distanceToSquared(Neighbor.pos);
};

MNode.prototype.setPos = function(X,Y,Z) {
	this.pos.set(X,Y,Z);
};

MNode.prototype.obj3d = function(Scene) {
    var loop = new THREE.Geometry();
    var radius = 0.8;
    for (var i=0; i<=16; i+=1) {
        var a = 2*Math.PI*i/16;
        loop.vertices.push(
        	new THREE.Vector3( this.pos.x+radius*Math.cos(a),
        						this.pos.y,
        						this.pos.z+radius*Math.sin(a) ));
    }
    this.obj = new THREE.Line(loop,
        new THREE.LineBasicMaterial( {color: 0xffffff} )
        );
    this.obj.name='disk';
    Scene.add(this.obj);
    return this.obj;
};

//////

function Maze(Scene) {
	this.scene = Scene;
	this.obj3d = new THREE.Object3D();
	this.scene.add(this.obj3d);
	this.nNodes = 0;
	this.nodes = {};
}

Maze.prototype.nearestFloor = function(Floor) {
	var i, j, upf, n, u, f, g, uN, dN;
	f = 1000000; // far away
	upf = Floor+1;
	for (i=0; i<this.nodeList.length; i+=1) {
		n = this.nodeList[i];
		if (n.floor === Floor) {
			for (j=0; j<this.nodeList.length; j+=1) {
				u = this.nodeList[j];
				if (u.floor === upf) {
					g = n.distSq(u);
					if (g<f) {
						uN = u;
						dN = n;
						f = g;
					}
				}
			}

		}
	}
	if (dN === undefined) {
		console.log('no match for floor '+Floor+'?');
		return;
	}
	dN.addEdge(uN,f);
};

Maze.prototype.nearest2D = function(Node,Count,MinDist) {
	var i, c, n, md, candidates;
	c=0;
	md = MinDist || 0.8;
	for (i in Node.edges) {
		c += 1;
	}
	if (c>=Count) {
		//console.log('Node '+Node.name+' already has '+c+' edges, asking for '+Count);
		return; // already have enough edges....
	}
	candidates = [];
	for (i=0; i<this.nodeList.length; i+=1) {
		n = this.nodeList[i];
		if ((Node !== n) && (Node.floor === n.floor)) {
			n._dd = Node.distSq(n);
			n._dd = (n._dd < md) ? (1000000) : n._dd;
			candidates.push(n);
		}
	}
	candidates.sort(function(a,b){return a._dd - b._dd;});
	//console.log(candidates);
	c = Count-c;
	//console.log(c);
	candidates = candidates.slice(0,c);
	//console.log(candidates);
	for (i=0; i<candidates.length; i+=1) {
		Node.addEdge(candidates[i],candidates[i]._dd);
	}
};

Maze.prototype.randNode = function() {
	var f = Math.floor(Math.random()*this.nFloors);
	var n = Math.floor(Math.random()*this.floorCount[f]);
	return ('F'+f+'P'+n);
};

Maze.prototype.path = function(Start,End) {
	return this.g.findShortestPath(Start,End);
};

Maze.prototype.init = function() {
	var f, n, i, j, y, d, floornodes;
	floornodes = [];
	this.floorCount = [];
	this.nodeList = [];
	this.nodes = {};
	this.map = {}; // simplified version used later for path-finding
	this.nFloors = Math.floor(1.4+Math.random()*2);
	for (var f=0; f<this.nFloors; f+=1) {
		floornodes[f] = [];
		y = (f-((this.nFloors-1)/2))*10;
		var fNodes = 30 + Math.floor(Math.random()*40);
		this.floorCount.push(fNodes);
		for (n=0; n<fNodes; n+=1) {
			var nName = ('F'+f+'P'+n);
			var newNode = new MNode(nName, f);
			var bad=true;
			while (bad) {
				bad=false;
				newNode.setPos(	(Math.random()-0.5)*38,
						y,
						(Math.random()-0.5)*28);
				for (j=0; j<this.nodeList.length; j+=1) {
					d = newNode.distSq(this.nodeList[j]);
					if (d<0.8) {
						bad=true;
					}
				}
			}
			newNode.floor = f;
			floornodes[f].push(newNode);
			this.nodes[nName] = newNode;
			this.nodeList.push(newNode);
		}
	}
};



Maze.prototype.makeGraph = function() {
	var i, j, e, n, p;
	for (i=0; i<this.nodeList.length; i+=1) {
		n = this.nodeList[i];
		e = {};
		for (j in n.edges) {
			p = n.edges[j];
			e[j] = p.d;
		}
		this.map[n.name]=e;
	}
	this.g = new Graph(this.map);
};

/************* eof **/
/************* eof **/
/************* eof **/