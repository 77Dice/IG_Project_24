
class RopeSim {
    constructor(nMasses, length) {
        // one rope with 2 ends and nothing more...
        // 2 vertex one fix and other free
        // every time you call Draw function, it will draw the rope with new positions
        // this positions follows the physics of the pendolum
        // i can interact with the free end of the rope
        // i can change the length of the rope
        // the free end has a massPoint that can be moved

        // for this i need ropeDrawer for draw the line
        // and i need a physics engine to simulate the rope (verlet integration)/ropesim.js

        // ora basta definire una classe che mandi avante la SIM..
        // posso riprendere tutto da MassSpring, sia come partire che come stoppare la SIM
        this.gravity = new Vec3(0, -2.0, 0);
        this.mass = 0.1;
        this.stiffness = 1;
        this.damping = 1;
        this.restitution = 0.8;    
        this.setRope(nMasses, length);                    
        
    }

    setRope(nMasses, length) {

        this.mesh = new RopeDrawer(ropeVertex, ropeFragment);

        this.reset(nMasses, length);
        this.initSprings(nMasses, length);
    }


    reset(nMasses, length) {
        this.vPos = Array(nMasses);
        for (var i = 0; i < nMasses; ++i) {
          this.vPos[i] = new Vec3(0, -length * i, 0);
        }
        this.vVel = Array(nMasses);
        for (var i = 0; i < nMasses; ++i) {
            this.vVel[i] = new Vec3(0, 0, 0);
        }
        this.vAcc = Array(nMasses);
        for (var i = 0; i < nMasses; ++i) {
            this.vAcc[i] = new Vec3(0, 0, 0);
        }
        this.vForce = Array(nMasses);
        for (var i = 0; i < nMasses; ++i) {
            this.vForce[i] = new Vec3(0, 0, 0);
        }
        this.vMass = Array(nMasses);
        for (var i = 0; i < nMasses; ++i) {
            this.vMass[i] = this.mass;
        }
        this.vFixed = Array(nMasses);
        this.vFixed[0] = true;
        for (var i = 1; i < nMasses; ++i) {
            this.vFixed[i] = false;
        }
    }

    
    initSprings(nMasses, length) {        
        this.springs = new Array(nMasses - 1);
        for (var i = 0; i < nMasses - 1; ++i) {
          this.springs[i] = { p0: i, p1: i + 1, rest: length };
        }
      }


    step(dt) {
        this.computeForces();
        this.integrate(dt);
      }



    }

      // do i need it?
function  RopeSimTimeStep(
    nMasses, length, gravity, mass, stiffness, damping, restitution, vPos, vVel, vAcc, vForce, vMass, vFixed
)
    {
    // Verlet integration
    // update positions
    for (var i = 0; i < nMasses; ++i) {
      if (!vFixed[i]) {
        vPos[i] = vPos[i].add(vVel[i].mul(0.01)).add(vAcc[i].mul(0.5 * 0.01 * 0.01));
      }
    }
    // update forces
    for (var i = 0; i < nMasses; ++i) {
      vForce[i] = gravity.mul(vMass[i]);
    }
    for (var i = 1; i < nMasses; ++i) {
      if (!vFixed[i - 1]) {
        var spring = vPos[i].sub(vPos[i - 1]);
        var dist = spring.length();
        var dir = spring.normalize();
        var force = dir.mul(stiffness * (dist - length));
        vForce[i] = vForce[i].sub(force);
        vForce[i - 1] = vForce[i - 1].add(force);
      }
    }
    for (var i = 0; i < nMasses; ++i) {
      vForce[i] = vForce[i].sub(vVel[i].mul(damping));
    }
    // update accelerations
    for (var i = 0; i < nMasses; ++i) {
      vAcc[i] = vForce[i].div(vMass[i]);
    }
    // update velocities
    for (var i = 0; i < nMasses; ++i) {
      if (!vFixed[i]) {
        vVel[i] = vVel[i].add(vAcc[i].mul(0.01));
      }
    }
    // collision detection and response
    for (var i = 0; i < nMasses; ++i) {
      if (vPos[i].y < 0) {
        vPos[i].y = 0;
        vVel[i].y = -vVel[i].y * restitution;
      }
    }
  }
