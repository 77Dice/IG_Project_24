function GetModelViewMatrix(
  translationX,
  translationY,
  translationZ,
  rotationX,
  rotationY
) {
  // first column
  let a = Math.cos(rotationY);
  let c = -Math.sin(rotationY);
  // second column
  let e = Math.sin(rotationY) * Math.sin(rotationX);
  let f = Math.cos(rotationX);
  let g = Math.cos(rotationY) * Math.sin(rotationX);
  // third column
  let i = Math.sin(rotationY) * Math.cos(rotationX);
  let j = -Math.sin(rotationX);
  let k = Math.cos(rotationY) * Math.cos(rotationX);

  var mv = [
    a,
    0,
    c,
    0,
    e,
    f,
    g,
    0,
    i,
    j,
    k,
    0,
    translationX,
    translationY,
    translationZ,
    1,
  ];

  return mv;
}

function setShaderProgram(meshVS, meshFS) {
  // compiling GLSL code
  let vtxShader = () => {
    const shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, meshVS);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(
        "An error occurred compiling shader:\n" + gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  let frgmShader = () => {
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, meshFS);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert(
        "An error occurred compiling shader:\n" + gl.getShaderInfoLog(shader)
      );
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };
  // create WebGL Program
  const prog = gl.createProgram();
  gl.attachShader(prog, vtxShader());
  gl.attachShader(prog, frgmShader());
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    alert(
      "Unable to initialize the shader program: " +
        gl.getProgramInfoLog(this.prog)
    );
    return null;
  }
  return prog;
}

// From last project
class MeshDrawer {
  constructor() {
    this.swap = false;
    this.showTex = true;
    this.loadTex = false;
    this.vertPos = [];
    this.texCoords = [];
    this.normals = [];
    this.pendolumVertPos = [];
    this.shininess = 0;
    this.lightDir = [0.0, 0.0, 0.0];
    this.numTriangles = 0;
    this.numLines = 0;
    this.positionBuffer = gl.createBuffer();
    this.txcBuffer = gl.createBuffer();
    this.mytex = gl.createTexture();
    this.normBuffer = gl.createBuffer();    
    this.pendolumBuffer = gl.createBuffer();
    

    // MODEL/OBJECT SPACE --> VIEW/CAMERA SPACE
    // p' = MV * p
    // n' = MN * n
    // MN = (MV)^-1 (inverse-transpose of matrixMV)
    this.meshVS = `
		  attribute vec3 pos;			
		attribute vec2 txc; 	  
	  attribute vec3 norm;
  
	  uniform mat4 mvp;		    
	  uniform mat4 modelViewMx;
	  uniform mat3 normalMx;
		  uniform float swapYZ;
		
		  varying vec4 vPositions;
	  varying vec3 vNormals;
	  varying vec2 texCoord;
  
	  void main() 
		  {
			  gl_Position = mvp * vec4(swapYZ == 1.0 ? pos.xzy : pos , 1);					      
		vPositions = modelViewMx * vec4(swapYZ == 1.0 ? pos.xzy : pos, 1);
		vNormals = normalMx * (swapYZ == 1.0 ? norm.xzy : norm);
		texCoord = txc;
		  }
		  `;

    // BLINN SHADING
    // use hVector instead of rVector
    // vec3 reflectDir = reflect(-lightDir, normal);

    this.meshFS = `
		uniform sampler2D tex;  
		  precision mediump float;	    
		   
	  uniform float loadTex;
		   uniform float showTex;
  
	  uniform float shininess;
	  uniform vec3 vLightDir;
		
	  varying vec2 texCoord;
	  varying vec3 vNormals;
	  varying vec4 vPositions;
		  
	  void main()
		  {
		
		vec3 viewDir = normalize(-vPositions.xyz);
		vec3 normal = normalize(vNormals);
		vec3 lightDir = normalize(vLightDir);
		vec3 halfDir = normalize(lightDir + viewDir);       
		
		vec3 lightIntensity = vec3(1.0, 1.0, 1.0);      
		vec3 ambient =  lightIntensity * vec3(0.1, 0.1, 0.1);
		vec3 Kd = vec3(1.0, 1.0, 1.0);
		vec3 Ks = vec3(1.0, 1.0, 1.0);
		
  
		if( loadTex == 1.0 && showTex == 1.0){
		  Kd = texture2D(tex, texCoord).xyz;  
		  ambient = lightIntensity * Kd * 0.1;
		}    
		
		float phiCos = max(0.0, dot(normal, halfDir));
		float thetaCos = max(0.0, dot(normal, lightDir));
			  
		vec3 diffuse = thetaCos * Kd;
		vec3 specular = pow(phiCos, shininess) * Ks;    
		
		gl_FragColor = vec4(ambient + diffuse + specular, 1.0);      
	  }
		  `;

    // compile shader Program
    this.prog = setShaderProgram(this.meshVS, this.meshFS);

    // get the location of the uniform variable
    this.mvp = gl.getUniformLocation(this.prog, "mvp");
    this.vrtxPos = gl.getAttribLocation(this.prog, "pos");
    this.texture = gl.getUniformLocation(this.prog, "tex");
    this.txcPos = gl.getAttribLocation(this.prog, "txc");
    this.swapPos = gl.getUniformLocation(this.prog, "swapYZ");
    this.loadTexPos = gl.getUniformLocation(this.prog, "loadTex");
    this.showTexPos = gl.getUniformLocation(this.prog, "showTex");
    // shader positions
    this.normPos = gl.getAttribLocation(this.prog, "norm");
    this.shininessPos = gl.getUniformLocation(this.prog, "shininess");
    this.lightDirPos = gl.getUniformLocation(this.prog, "vLightDir");
    this.mvMx = gl.getUniformLocation(this.prog, "modelViewMx");
    this.normMx = gl.getUniformLocation(this.prog, "normalMx");
  }

  setMesh(vertPos, texCoords, normals) {
    this.numTriangles = vertPos.length / 3;
    this.vertPos = vertPos;
    this.texCoords = texCoords;
    this.normals = normals;
    // pendolum
    this.pendolumVertPos = new Float32Array([
      // vertex of pendolum
      0, 0, 0, 0, -1, 0,
    ]);
    this.numLines = this.pendolumVertPos.length / 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pendolumBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.pendolumVertPos, gl.STATIC_DRAW);

    // allocate data on GPU memory
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.vertPos),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.txcBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.texCoords),
      gl.STATIC_DRAW
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.normals),
      gl.STATIC_DRAW
    );
  }

  draw(matrixMVP, matrixMV, matrixNormal) {
    // clear the canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);
    // set Uniforms
    gl.uniformMatrix4fv(this.mvp, false, matrixMVP);
    gl.uniformMatrix4fv(this.mvMx, false, matrixMV);
    gl.uniformMatrix3fv(this.normMx, false, matrixNormal);
    gl.uniform1f(this.swapPos, this.swap ? 1.0 : 0.0);
    gl.uniform1f(this.loadTexPos, this.loadTex ? 1.0 : 0.0);
    gl.uniform1f(this.showTexPos, this.showTex ? 1.0 : 0.0);
    gl.uniform1f(this.shininessPos, this.shininess);
    gl.uniform3fv(this.lightDirPos, this.lightDir);
    // send texture to shader
    gl.uniform1i(this.texture, 0);
    // init vrtxPos with buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(this.vrtxPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vrtxPos);
    // init txcPos with buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.txcBuffer);
    gl.vertexAttribPointer(this.txcPos, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.txcPos);
    // init normPos with buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuffer);
    gl.vertexAttribPointer(this.normPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.normPos);

    // pendolum
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pendolumBuffer);
    gl.vertexAttribPointer(this.pendolumVertPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.pendolumVertPos);
    
    

    gl.drawArrays(gl.LINES, 0, this.numLines);


    // draw
    gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);
  }

  // If you perform shading in the camera space,
  // you do not need to transform the light direction
  setLightDir(x, y, z) {
    this.lightDir = [x, y, z];
  }

  setShininess(shininess) {
    this.shininess = shininess;
  }

  setTexture(img) {
    if (img != null) {
      this.loadTex = true;

      gl.bindTexture(gl.TEXTURE_2D, this.mytex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);

      // filters
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      );

      // binding
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.mytex);
    } else this.loadTex = false;
  }

  showTexture(show) {
    this.showTex = show;
  }

  swapYZ(swap) {
    this.swap = swap;
  }
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
  });
  // Compute Acceleration for each particle
  let acc = forces.map((f) => f.div(particleMass));
  // Update positions and velocities
  velocities.forEach((vel, i) => {
    // Semi-Implicit Euler Integration ------------------------------------------        
    vel.inc(acc[i].mul(dt));    
    positions[i].inc(vel.mul(dt));
  });  
  // Handle collisions
  positions.forEach((pos, i) => {
    if (pos.y < -1.0) {
      let h = -1.0 - pos.y;
      pos.y = -1.0 + h*restitution;      
      velocities[i] = velocities[i].mul(-restitution);
    }
    if(pos.y > 1.0){
      let h = pos.y - 1.0;
      pos.y = 1.0 - h*restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if(pos.x < -1.0){
      let h = -1.0 - pos.x;
      pos.x = -1.0 + h*restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if(pos.x > 1.0){
      let h = pos.x - 1.0;
      pos.x = 1.0 - h*restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if(pos.z < -1.0){
      let h = -1.0 - pos.z;
      pos.z = -1.0 + h*restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
    if(pos.z > 1.0){
      let h = pos.z - 1.0;
      pos.z = 1.0 - h*restitution;
      velocities[i] = velocities[i].mul(-restitution);
    }
  });
}
