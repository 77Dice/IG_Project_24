///////////////////////////////////////////////////////////////////////////////////
// Below is the mass-spring system code
///////////////////////////////////////////////////////////////////////////////////

class MassSpring {
  constructor() {
    this.gravity = new Vec3(0, -2.0, 0);
    this.mass = 0.1;
    this.stiffness = 1;
    this.damping = 1;
    this.restitution = 0.8;
    // return this.mesh as a new ObjLoader object
    // then load the specific Mesh file
    // WE NEED to store the Rope vertex...
    // devo salvare la posizione dei vertici della corda
    // e applicare una forza verso la direzione della corda
    // quando questa si allunga!! o streccia.. come se fosse
    // una molla...  (devo aggiungere una molla!!)
    // una molla per la Corda che regge la palla in aria!!!
    this.setMesh(document.getElementById("box.obj").text);
  }

  //initialize the wavefront object through the objLoader Class
  setMesh(objdef) {
    this.mesh = new ObjLoader();
    this.mesh.parse(objdef);
    var box = this.mesh.getBoundingBox();
    var shift = [
      -(box.min[0] + box.max[0]) / 2,
      -(box.min[1] + box.max[1]) / 2,
      -(box.min[2] + box.max[2]) / 2,
    ];
    var size = [
      (box.max[0] - box.min[0]) / 2,
      (box.max[1] - box.min[1]) / 2,
      (box.max[2] - box.min[2]) / 2,
    ];
    var maxSize = Math.max(size[0], size[1], size[2]);
    var scale = 0.4 / maxSize;
    this.mesh.shiftAndScale(shift, scale);
    this.mesh.computeNormals();
    // the object is loaded, now we can init the simulation
    // in these functions i need to add
    // 1 more Spring for the rope
    // the force applied
    // the mass point for the Rope (the one attached to the ball || the center of the OBJ)
    this.reset();
    this.initSprings();
    DrawScene();
  }

  initSprings() {
    this.springs = [];
    for (var i = 0; i < this.pos.length; ++i) {
      for (var j = i + 1; j < this.pos.length; ++j) {
        var r = this.pos[i].sub(this.pos[j]).len();
        // if they are too close, they are not connected (rest is the rest length of the spring)
        if (r > 0.02) {
          if (j != this.pos.length - 1)
            this.springs.push({ p0: i, p1: j, rest: r });
          // connect cealing only to the CENTER mass point
          if (j == this.pos.length - 1 && i == this.pos.length - 2) {
            console.log("Spring-Center/Cealing", i, j, r);
            this.springs.push({ p0: i, p1: j, rest: r });
          }
        }
      }
    }
  }

  reset() {
    this.buffers = this.mesh.getVertexBuffers();
    // add one to POS and VEL (no NORM) to add the CENTER mass point
    // +1 for the center mass point
    // +1 for the cealing mass point
    this.pos = Array(this.mesh.vpos.length + 2);
    for (var i = 0; i < this.pos.length - 2; ++i)
      this.pos[i] = ToVec3(this.mesh.vpos[i]);
    // OPZIONALE: getRopeVertex(this.buffers.positionBuffer)
    let center = getCenterOfMesh(this.buffers.positionBuffer);
    this.pos[this.pos.length - 2] = ToVec3(center); // center
    this.pos[this.pos.length - 1] = new Vec3(0, 1, 0); // ceiling

    // the last point have fixed position(in the STEP i do not consider it!!)
    // and velocity (the last one in the ARRAy is ALWAys ZERO!!)
    this.vel = Array(this.pos.length);
    for (var i = 0; i < this.vel.length; ++i) this.vel[i] = new Vec3(0, 0, 0);
    this.nrm = Array(this.mesh.norm.length);
    for (var i = 0; i < this.nrm.length; ++i)
      this.nrm[i] = ToVec3(this.mesh.norm[i]);

    //console.log(center, this.pos[this.pos.length - 1]);

    meshDrawer.setMesh(
      // mesh of WHO? --> (the one in the project7.html file!!)
      this.buffers.positionBuffer,
      this.buffers.texCoordBuffer,
      this.buffers.normalBuffer
    );
  }

  updateMesh() {
    function updateBuffer(buffer, faces, verts) {
      function addTriangleToBuffer(buffer, bi, vals, i, j, k) {
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
      for (var i = 0, bi = 0; i < faces.length; ++i) {
        var f = faces[i];
        if (f.length < 3) continue;
        addTriangleToBuffer(buffer, bi, verts, f[0], f[1], f[2]);
        bi += 9;
        for (var j = 3; j < f.length; ++j, bi += 9) {
          addTriangleToBuffer(buffer, bi, verts, f[0], f[j - 1], f[j]);
        }
      }
    }

    // update the position buffer
    updateBuffer(this.buffers.positionBuffer, this.mesh.face, this.pos);

    // update normals
    for (var i = 0; i < this.nrm.length; ++i) this.nrm[i].init(0, 0, 0);
    for (var i = 0; i < this.mesh.face.length; ++i) {
      var f = this.mesh.face[i];
      var nf = this.mesh.nfac[i];
      var v0 = this.pos[f[0]];
      for (var j = 1; j < f.length - 1; ++j) {
        var v1 = this.pos[f[j]];
        var v2 = this.pos[f[j + 1]];
        var e0 = v1.sub(v0);
        var e1 = v2.sub(v0);
        var n = e0.cross(e1);
        n = n.unit();
        this.nrm[nf[0]].inc(n);
        this.nrm[nf[j]].inc(n);
        this.nrm[nf[j + 1]].inc(n);
      }
    }
    for (var i = 0; i < this.nrm.length; ++i) this.nrm[i].normalize();
    updateBuffer(this.buffers.normalBuffer, this.mesh.nfac, this.nrm);

    // Update the mesh drawer and redraw scene
    meshDrawer.setMesh(
      this.buffers.positionBuffer,
      this.buffers.texCoordBuffer,
      this.buffers.normalBuffer
    );

    pointDrawer.updatePoint();
    DrawScene();
  }

  simTimeStep() {
    // remember the position of the selected vertex, if any
    var p = this.holdVert ? this.holdVert.copy() : undefined;

    // Update positions and velocities
    var timestep = document.getElementById("timestep").value;
    const dt = timestep / 1000; // time step in seconds
    const damping = this.damping * this.stiffness * dt;
    SimTimeStep(
      dt,
      this.pos,
      this.vel,
      this.springs,
      this.stiffness,
      damping,
      this.mass,
      this.gravity,
      this.restitution
    );

    // make sure that the selected vertex does not change position
    if (p) {
      this.holdVert.set(p);
      this.vel[this.selVert].init(0, 0, 0);
    }

    this.updateMesh();
  }
  startSimulation() {
    var timestep = document.getElementById("timestep").value;
    if (!this.isSimulationRunning())
      this.timer = setInterval(function () {
        massSpring.simTimeStep();
      }, timestep);
  }
  stopSimulation() {
    clearInterval(this.timer);
    this.timer = undefined;
  }
  isSimulationRunning() {
    return this.timer !== undefined;
  }
  restartSimulation() {
    if (this.isSimulationRunning()) {
      this.stopSimulation();
      this.startSimulation();
    }
  }
  toggleSimulation(btn) {
    if (this.isSimulationRunning()) {
      this.stopSimulation();
      btn.value = "Start Simulation";
    } else {
      this.startSimulation();
      btn.value = "Stop Simulation";
    }
  }

  mouseMove() {
    var m = MousePos();
    this.selVert = undefined;
    var selPt;
    var minDist = 10;
    for (var i = 0; i < this.pos.length; ++i) {
      var p = this.pos[i];
      var pv = p.trans(MVP);
      var px = pv.x / pv.w;
      var py = pv.y / pv.w;
      var dx = m.x - px;
      var dy = m.y - py;
      var len2 = dx * dx + dy * dy;
      if (len2 < 0.001 && len2 < minDist) {
        minDist = len2;
        this.selVert = i;
        selPt = p;
      }
    }
    if (pointDrawer.setPoint(selPt)) {
      DrawScene();
      canvas.className = selPt ? "sel" : "";
    }
  }

  mouseDown() {
    if (this.selVert === undefined) return false;
    var mInv = MatrixInverse(MVP);
    var p = this.pos[this.selVert];
    var pv = p.trans(MVP);
    this.holdVert = this.pos[this.selVert];

    function mouse4D() {
      var m = MousePos();
      return {
        x: m.x * pv.w,
        y: m.y * pv.w,
        z: pv.z,
        w: pv.w,
      };
    }

    function invTrans(v) {
      return {
        x: mInv[0] * v.x + mInv[4] * v.y + mInv[8] * v.z + mInv[12] * v.w,
        y: mInv[1] * v.x + mInv[5] * v.y + mInv[9] * v.z + mInv[13] * v.w,
        z: mInv[2] * v.x + mInv[6] * v.y + mInv[10] * v.z + mInv[14] * v.w,
        w: mInv[3] * v.x + mInv[7] * v.y + mInv[11] * v.z + mInv[15] * v.w,
      };
    }

    function mouse3D() {
      var m = invTrans(mouse4D());
      return new Vec3(m.x / m.w, m.y / m.w, m.z / m.w);
    }

    var m0 = mouse3D();
    var ms = this;

    canvas.onmousemove = function () {
      var m1 = mouse3D();
      var d = m1.sub(m0);
      m0 = { ...m1 };
      p.inc(d);
      ms.updateMesh();
    };
    return true;
  }

  mouseUp() {
    this.holdVert = undefined;
  }
}

class Vec3 {
  constructor(x, y, z) {
    this.init(x, y, z);
  }
  init(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  copy() {
    return new Vec3(this.x, this.y, this.z);
  }
  set(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
  }
  inc(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
  }
  dec(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
  }
  scale(f) {
    this.x *= f;
    this.y *= f;
    this.z *= f;
  }
  add(v) {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }
  sub(v) {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  cross(v) {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }
  mul(f) {
    return new Vec3(this.x * f, this.y * f, this.z * f);
  }
  div(f) {
    return new Vec3(this.x / f, this.y / f, this.z / f);
  }
  len2() {
    return this.dot(this);
  }
  len() {
    return Math.sqrt(this.len2());
  }
  unit() {
    return this.div(this.len());
  }
  normalize() {
    var l = this.len();
    this.x /= l;
    this.y /= l;
    this.z /= l;
  }
  trans(m) {
    return {
      x: m[0] * this.x + m[4] * this.y + m[8] * this.z + m[12],
      y: m[1] * this.x + m[5] * this.y + m[9] * this.z + m[13],
      z: m[2] * this.x + m[6] * this.y + m[10] * this.z + m[14],
      w: m[3] * this.x + m[7] * this.y + m[11] * this.z + m[15],
    };
  }
}

function ToVec3(a) {
  return new Vec3(a[0], a[1], a[2]);
}

// This function is called for every step of the simulation.
// Its job is to advance the simulation for the given time step duration dt.
// It updates the given positions and velocities.
function SimTimeStep(
  dt,
  positions,
  velocities,
  springs,
  stiffness,
  damping,
  particleMass,
  gravity,
  restitution
) {
  /*
	init(x,y,z): sets the x, y, and z coordinates to the given values.
	copy(): returns a copy of the vector object.
	set(v): sets the x, y, and z coordinates to the same values as the given vector v.
	inc(v): increments the x, y, and z coordinate values by adding the coordinate values of the given vector v.
	dec(v): decrements the x, y, and z coordinate values by subtracting the coordinate values of the given vector v.
	scale(f): multiplies the x, y, and z coordinates by the given scalar f.
	add(v): add the given vector v to this vector and returns the resulting vector.
	sub(v): subtracts the given vector v from this vector and returns the resulting vector.
	dot(v): computes the dot product of this vector and the given vector v and returns the resulting scalar.
	cross(v): computes the cross product of this vector and the given vector v and returns the resulting vector.
	mul(f): multiplies the vector by the given scalar f and returns the result.
	div(f): divides the vector by the given scalar f and returns the result.
	len2(): returns the squared length of the vector.
	len(): returns the length of the vector.
	unit(): returns the unit vector along the direction of this vector.
	normalize(): normalizes this vector, turning it into a unit vector.
	*/
  var forces = [...Array(positions.length)].map(
    (_, i) => new Vec3(0, gravity.y * particleMass, 0)
  );
  // Compute the total force of each particle
  springs.forEach((spring) => {
    // spring = {p0: , p1: , rest: }
    let p0 = spring.p0;
    let p0Pos = positions[p0]; //Vec3
    let p0Vel = velocities[p0]; //Vec3
    let p1 = spring.p1;
    let p1Pos = positions[p1];
    let p1Vel = velocities[p1];
    let restLength = spring.rest; //float

    // if Center/Cealing Spring Force...
    // voglio che sia Inelastica, quindi la forza è la forza di gravità
    if (p1 == positions.length - 1 && p0 == positions.length - 2) {
      // se considero il filo come una molla molto rigida
      // allora la forza è la forza di gravità
      let lSpring = p1Pos.sub(p0Pos).len();
      let springDir = p1Pos.sub(p0Pos).div(lSpring);
      let springForceP0 = springDir.mul(stiffness * (lSpring - restLength));
      let springForceP1 = springForceP0.mul(-1);
      // damping force
      let lDamp = p1Vel.sub(p0Vel).dot(springDir);
      let dampForceP0 = springDir.mul(damping * lDamp);
      let dampForceP1 = dampForceP0.mul(-1);
      //console.log("P0",springForceP0, dampForceP0);
      //console.log("P1",springForceP1, dampForceP1);
      // total force
      forces[p0] = forces[p0].add(springForceP0).add(dampForceP0);
      forces[p1] = forces[p1].add(springForceP1).add(dampForceP1);
    } else {
      // spring Force
      let lSpring = p1Pos.sub(p0Pos).len();
      let springDir = p1Pos.sub(p0Pos).div(lSpring);
      let springForceP0 = springDir.mul(stiffness * (lSpring - restLength));
      let springForceP1 = springForceP0.mul(-1);
      // damping force
      let lDamp = p1Vel.sub(p0Vel).dot(springDir);
      let dampForceP0 = springDir.mul(damping * lDamp);
      let dampForceP1 = dampForceP0.mul(-1);
      //console.log("P0",springForceP0, dampForceP0);
      //console.log("P1",springForceP1, dampForceP1);
      // total force
      forces[p0] = forces[p0].add(springForceP0).add(dampForceP0);
      forces[p1] = forces[p1].add(springForceP1).add(dampForceP1);
    }
  });
  // Compute Acceleration for each particle
  let acc = forces.map((f) => f.div(particleMass));
  // Update positions and velocities
  velocities.forEach((vel, i) => {
    if (i == positions.length - 1) return; // cealing mass point
    // Semi-Implicit Euler Integration ------------------------------------------
    vel.inc(acc[i].mul(dt));
    positions[i].inc(vel.mul(dt));
  });
  // Handle collisions
  positions.forEach((pos, i) => {
    if (pos.y < -1.0) {
      let h = -1.0 - pos.y;
      pos.y = -1.0 + h * restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if (pos.y > 1.0) {
      let h = pos.y - 1.0;
      pos.y = 1.0 - h * restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if (pos.x < -1.0) {
      let h = -1.0 - pos.x;
      pos.x = -1.0 + h * restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if (pos.x > 1.0) {
      let h = pos.x - 1.0;
      pos.x = 1.0 - h * restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if (pos.z < -1.0) {
      let h = -1.0 - pos.z;
      pos.z = -1.0 + h * restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if (pos.z > 1.0) {
      let h = pos.z - 1.0;
      pos.z = 1.0 - h * restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
  });
}
