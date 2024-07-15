// From last project
// draw the mesh you give him through the setMesh method!!
// in this class you can apply shadows and textures to the mesh!!

// i mix together the meshDrawer and the ropeDrawer,
// so everytime you call the setMesh method
// you can draw the mesh & the Rope!!
class MeshDrawer {
  constructor() {
    this.swap = false;
    this.showTex = true;
    this.loadTex = false;
    this.vertPos = [];
    this.texCoords = [];
    this.normals = [];
    this.shininess = 0;
    this.lightDir = [0.0, 0.0, 0.0];
    this.numTriangles = 0;
    this.positionBuffer = gl.createBuffer();
    this.txcBuffer = gl.createBuffer();
    this.mytex = gl.createTexture();
    this.normBuffer = gl.createBuffer();
    // rope variables
    this.ropeVertices = [];
    this.ropeBuffer = gl.createBuffer();
    this.ropeFreeIndex = -1;
    this.ropeVLock = 0;

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

    // rope shaders
    this.ropeVS = `
      attribute vec3 coordinates;
        uniform mat4 mvp;
           void main() {
                       //gl_Position = vec4(coordinates, 1.0);
                       gl_Position = mvp * vec4(coordinates,1.0);
                   }
                  `;
    this.ropeFS = `
        void main(void) {
            gl_FragColor = vec4(1,0,1,1);
                    }
            `;

    // compile shader Program
    this.prog = InitShaderProgram(this.meshVS, this.meshFS);
    this.ropeProg = InitShaderProgram(this.ropeVS, this.ropeFS);

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

    // rope Locations
    this.ropeMVP = gl.getUniformLocation(this.ropeProg, "mvp");
    this.ropeVPos = gl.getAttribLocation(this.ropeProg, "coordinates");
  }

  // This method is called every time
  // 1. the user opens an OBJ file
  // 2. when you load new frame in the simulation
  // Note that this method can be called multiple times.

  setMesh(vertPos, texCoords, normals) {
    // rope vertices & buffer
    // everytime you change the mesh (n. of vertex)...
    // OPT 1. you fix the rope to the highest vertex
    /*
    {
    if (this.ropeVLock != vertPos.length) {
      this.ropeFreeIndex = getRopeVertex(vertPos);      
      this.ropeVLock = vertPos.length;      
      //console.log("Rope Free Index: " + this.ropeFreeIndex);
    }    
    this.ropeVertices = new Float32Array([
      0.0,
      1.0,
      0.0,
      vertPos[this.ropeFreeIndex],
      vertPos[this.ropeFreeIndex + 1],
      vertPos[this.ropeFreeIndex + 2],
    ]);
  }
    */

    // OPT 2. you fix the rope to the center of the mesh
    let center = getCenterOfMesh(vertPos);        
    let cealing = [vertPos[vertPos.length-3], vertPos[vertPos.length -2], vertPos[vertPos.length -1]];
    let VerCenter = [vertPos[vertPos.length-6], vertPos[vertPos.length-5], vertPos[vertPos.length -  4]];

    console.log("Center: ", center);
    //console.log("Cealing: ", cealing);
    console.log("VerCenter: ", VerCenter);
    this.ropeVertices = new Float32Array([
      0.0,
      1.0,
      0.0,
      center[0],
      center[1],
      center[2],
    ]);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.ropeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.ropeVertices, gl.STATIC_DRAW);
    // mesh vertices & buffers
    this.numTriangles = vertPos.length / 3;
    this.vertPos = vertPos;
    this.texCoords = texCoords;
    this.normals = normals;
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

  // This method is called every time
  // you update the camera position or orientation.
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
    // draw
    gl.drawArrays(gl.TRIANGLES, 0, this.numTriangles);

    // draw rope
    gl.useProgram(this.ropeProg);
    gl.uniformMatrix4fv(this.ropeMVP, false, matrixMVP);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ropeBuffer);
    gl.vertexAttribPointer(this.ropeVPos, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.ropeVPos);
    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.LINES, 0, 2);
    gl.enable(gl.DEPTH_TEST);
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

// return the index of the Vertex in the mesh
// that is higher in the Y axis
function getRopeVertex(vertPos) {
  let maxY = -2;
  let index = -1;
  console.log(vertPos.length, "VertPos Length");
  for (let i = 0; i < vertPos.length; i += 3) {
    if (vertPos[i + 1] > maxY) {
      maxY = vertPos[i + 1];
      index = i;
    }
  }
  return index;
}

// return the coordinates of the center of the mesh
function getCenterOfMesh(vertPos) {
  let sumX = 0,
    sumY = 0,
    sumZ = 0;
  let numVertices = vertPos.length / 3;
  for (let i = 0; i < vertPos.length; i += 3) {
    sumX += vertPos[i];
    sumY += vertPos[i + 1];
    sumZ += vertPos[i + 2];
  }
  let middleX = sumX / numVertices;
  let middleY = sumY / numVertices;
  let middleZ = sumZ / numVertices;
  return [middleX, middleY, middleZ];
}
