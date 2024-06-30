///////////////////////////////////////////////////////////////////////////////////
// Below is the mass-spring system code
///////////////////////////////////////////////////////////////////////////////////
class Vec3 {
	constructor( x, y, z ) { this.init(x,y,z); }
	init( x, y, z ) { this.x=x; this.y=y; this.z=z; }
	copy ( ) { return new Vec3( this.x, this.y, this.z ); }
	set  (v) { this.x =v.x; this.y =v.y; this.z =v.z; }
	inc  (v) { this.x+=v.x; this.y+=v.y; this.z+=v.z; }
	dec  (v) { this.x-=v.x; this.y-=v.y; this.z-=v.z; }
	scale(f) { this.x*=f; this.y*=f; this.z*=f; }
	add  (v) { return new Vec3( this.x+v.x, this.y+v.y, this.z+v.z ); }
	sub  (v) { return new Vec3( this.x-v.x, this.y-v.y, this.z-v.z ); }
	dot  (v) { return this.x*v.x + this.y*v.y + this.z*v.z; }
	cross(v) { return new Vec3( this.y*v.z-this.z*v.y, this.z*v.x-this.x*v.z, this.x*v.y-this.y*v.x ); }
	mul  (f) { return new Vec3( this.x*f, this.y*f, this.z*f ); }
	div  (f) { return new Vec3( this.x/f, this.y/f, this.z/f ); }
	len2 ( ) { return this.dot(this); }
	len  ( ) { return Math.sqrt(this.len2()); }
	unit ( ) { return this.div(this.len()); }
	normalize() {
		var l = this.len();
		this.x /= l;
		this.y /= l;
		this.z /= l;
	}
	trans(m) {
		return {
			x: m[0]*this.x + m[4]*this.y + m[ 8]*this.z + m[12],
			y: m[1]*this.x + m[5]*this.y + m[ 9]*this.z + m[13],
			z: m[2]*this.x + m[6]*this.y + m[10]*this.z + m[14],
			w: m[3]*this.x + m[7]*this.y + m[11]*this.z + m[15]
		};
	}
}

function ToVec3(a) { return new Vec3(a[0],a[1],a[2]); }

class MassSpring {

	constructor(type)
	{
		this.gravity = new Vec3( 0, -2.0, 0 );
		this.mass = .1;
		this.stiffness = 1;
		this.damping = 1;
		this.restitution = .8;		
		this.setMesh(document.getElementById('box.obj').text );
	}


	//pass wavefront.obj to be parsed
	setMesh( objdef )
	{
		this.mesh = new ObjLoader;
		this.mesh.parse( objdef );
		var box = this.mesh.getBoundingBox();
		var shift = [
			-(box.min[0]+box.max[0])/2,
			-(box.min[1]+box.max[1])/2,
			-(box.min[2]+box.max[2])/2
		];
		var size = [
			(box.max[0]-box.min[0])/2,
			(box.max[1]-box.min[1])/2,
			(box.max[2]-box.min[2])/2
		];
		var maxSize = Math.max( size[0], size[1], size[2] );
		var scale = 0.4/maxSize;
		this.mesh.shiftAndScale( shift, scale );
		this.mesh.computeNormals();
		this.reset();
		this.initSprings();
		DrawScene();
	}
	
	initSprings()
	{
		this.springs = [];
		for ( var i=0; i<this.pos.length; ++i ) {
			for ( var j=i+1; j<this.pos.length; ++j ) {
				var r = this.pos[i].sub(this.pos[j]).len();
				if ( r > .02 ) 
				{
					this.springs.push( { p0:i, p1:j, rest:r } );
				}
			}
		}
	}
	
	reset()
	{
		this.pos = Array( this.mesh.vpos.length );
		for ( var i=0; i<this.pos.length; ++i ) this.pos[i] = ToVec3( this.mesh.vpos[i] );
		this.vel = Array( this.pos.length );
		for ( var i=0; i<this.vel.length; ++i ) this.vel[i] = new Vec3(0,0,0);
		this.nrm = Array( this.mesh.norm.length );
		for ( var i=0; i<this.nrm.length; ++i ) this.nrm[i] = ToVec3( this.mesh.norm[i] );
		this.buffers = this.mesh.getVertexBuffers();
		meshDrawer.setMesh( this.buffers.positionBuffer, this.buffers.texCoordBuffer, this.buffers.normalBuffer );
	}

	updateMesh()
	{
		function updateBuffer( buffer, faces, verts )
		{
			function addTriangleToBuffer( buffer, bi, vals, i, j, k )
			{
				buffer[bi++] = vals[i].x;
				buffer[bi++] = vals[i].y;
				buffer[bi++] = vals[i].z;
				buffer[bi++] = vals[j].x;
				buffer[bi++] = vals[j].y;
				buffer[bi++] = vals[j].z;
				buffer[bi++] = vals[k].x;
				buffer[bi++] = vals[k].y;
				buffer[bi++] = vals[k].z;
			}
			for ( var i=0, bi=0; i<faces.length; ++i ) {
				var f = faces[i];
				if ( f.length < 3 ) continue;
				addTriangleToBuffer( buffer, bi, verts, f[0], f[1], f[2] );
				bi += 9;
				for ( var j=3; j<f.length; ++j, bi+=9 ) {
					addTriangleToBuffer( buffer, bi, verts, f[0], f[j-1], f[j] );
				}
			}
		}
		
		// update the position buffer
		updateBuffer( this.buffers.positionBuffer, this.mesh.face, this.pos );
		
		// update normals
		for ( var i=0; i<this.nrm.length; ++i ) this.nrm[i].init(0,0,0);
		for ( var i=0; i<this.mesh.face.length; ++i ) {
			var f = this.mesh.face[i];
			var nf = this.mesh.nfac[i];
			var v0 = this.pos[ f[0] ];
			for ( var j=1; j<f.length-1; ++j ) {
				var v1 = this.pos[ f[j] ];
				var v2 = this.pos[ f[j+1] ];
				var e0 = v1.sub(v0);
				var e1 = v2.sub(v0);
				var n  = e0.cross(e1);
				n = n.unit();
				this.nrm[ nf[0  ] ].inc(n);
				this.nrm[ nf[j  ] ].inc(n);
				this.nrm[ nf[j+1] ].inc(n);
			}
		}
		for ( var i=0; i<this.nrm.length; ++i ) this.nrm[i].normalize();
		updateBuffer( this.buffers.normalBuffer, this.mesh.nfac, this.nrm );

		// Update the mesh drawer and redraw scene
		meshDrawer.setMesh( this.buffers.positionBuffer, this.buffers.texCoordBuffer, this.buffers.normalBuffer );

		pointDrawer.updatePoint();
		DrawScene();
	}

	simTimeStep()
	{
		// remember the position of the selected vertex, if any
		var p = this.holdVert ? this.holdVert.copy() : undefined;

		// Update positions and velocities
		var timestep = document.getElementById('timestep').value;
		const dt = timestep / 1000;	// time step in seconds
		const damping = this.damping * this.stiffness * dt;
		SimTimeStep( dt, this.pos, this.vel, this.springs, this.stiffness, damping, this.mass, this.gravity, this.restitution );
		
		// make sure that the selected vertex does not change position
		if ( p ) {
			this.holdVert.set(p);
			this.vel[ this.selVert ].init(0,0,0);
		}
		
		this.updateMesh();
	}
	startSimulation()
	{
		var timestep = document.getElementById('timestep').value;
		if ( ! this.isSimulationRunning() ) this.timer = setInterval( function(){ massSpring.simTimeStep(); }, timestep );
	}
	stopSimulation()
	{
		clearInterval( this.timer );
		this.timer = undefined;
	}
	isSimulationRunning() { return this.timer !== undefined; }
	restartSimulation() { if ( this.isSimulationRunning() ) { this.stopSimulation(); this.startSimulation(); } }
	toggleSimulation( btn )
	{
		if ( this.isSimulationRunning() ) {
			this.stopSimulation();
			btn.value = "Start Simulation";
		} else {
			this.startSimulation();
			btn.value = "Stop Simulation";
		}
	}
	
	mouseMove()
	{
		var m = MousePos();
		this.selVert = undefined;
		var selPt;
		var minDist = 10;
		for ( var i=0; i<this.pos.length; ++i ) {
			var p = this.pos[i];
			var pv = p.trans(MVP);
			var px = pv.x / pv.w;
			var py = pv.y / pv.w;
			var dx = m.x - px;
			var dy = m.y - py;
			var len2 = dx*dx + dy*dy;
			if ( len2 < 0.001 && len2 < minDist ) {
				minDist = len2;
				this.selVert = i;
				selPt = p;
			}
		}
		if ( pointDrawer.setPoint( selPt ) ) {
			DrawScene();
			canvas.className = selPt ? "sel" : "";
		}
	}
	
	mouseDown()
	{
		if ( this.selVert === undefined ) return false;
		var mInv = MatrixInverse(MVP);
		var p = this.pos[ this.selVert ];
		var pv = p.trans(MVP);
		this.holdVert = this.pos[ this.selVert ];
		
		function mouse4D()
		{
			var m = MousePos();
			return {
				x: m.x * pv.w,
				y: m.y * pv.w,
				z: pv.z,
				w: pv.w
			};
		}
		
		function invTrans(v)
		{
			return {
				x: mInv[0]*v.x + mInv[4]*v.y + mInv[ 8]*v.z + mInv[12]*v.w,
				y: mInv[1]*v.x + mInv[5]*v.y + mInv[ 9]*v.z + mInv[13]*v.w,
				z: mInv[2]*v.x + mInv[6]*v.y + mInv[10]*v.z + mInv[14]*v.w,
				w: mInv[3]*v.x + mInv[7]*v.y + mInv[11]*v.z + mInv[15]*v.w
			};
		}
		
		function mouse3D() { 
			var m = invTrans(mouse4D());
			return new Vec3( m.x/m.w, m.y/m.w, m.z/m.w );
		}
		
		var m0 = mouse3D();
		var ms = this;
		
		canvas.onmousemove = function() {
			var m1 = mouse3D();
			var d = m1.sub(m0);
			m0 = { ...m1 };
			p.inc(d);
			ms.updateMesh();
		}
		return true;		
	}
	
	mouseUp()
	{
		this.holdVert = undefined;
	}
}