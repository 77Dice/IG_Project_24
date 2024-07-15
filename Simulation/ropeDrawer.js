// Draw Ropes of Pendolum 
// call Draw for every step of the simulation

// I could add a MeshDrawer CONNECTED TO RopeDrawer... dove centro la sfera sul vertice LIBERO!!!

class RopeDrawer {
    constructor(fix, free)
      {
          // Compile the shader program
          this.prog = InitShaderProgram( ropeVShader, ropeFShader );
          
          // Get the ids of the uniform variables in the shaders
          this.mvp = gl.getUniformLocation( this.prog, 'mvp' );
  
          // Get the ids of the vertex attributes in the shaders
          this.vertPos = gl.getAttribLocation( this.prog, 'coordinates' );
          
          // Create the buffer objects
          this.vertexBuffer = gl.createBuffer();
  
          this.vertices = new Float32Array(
              [fix[0], fix[1], fix[2],
              free[0], free[1], free[2]]
            );
            
            

        }
        
    // update vertex free
    update(free){
        this.vertices = new Float32Array(
            [this.vertices[0], this.vertices[1], this.vertices[2],
            free[0], free[1], free[2]]
        );
    }

    // draw rope
    draw( trans ) //trans --> mvp
      {		
              gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
              gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
              gl.useProgram( this.prog );
              gl.uniformMatrix4fv( this.mvp, false, trans );
              gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
              gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
              gl.enableVertexAttribArray( this.vertPos );
              gl.disable(gl.DEPTH_TEST);
              gl.drawArrays( gl.LINES, 0, 2 );
              gl.enable(gl.DEPTH_TEST);
      }
  }

  var ropeVShader =
   `attribute vec3 coordinates;
   uniform mat4 mvp;
      void main() {
                  //gl_Position = vec4(coordinates, 1.0);
                  gl_Position = mvp * vec4(coordinates,1.0);
              }
                  `;
  var ropeFShader =
  `
  void main(void) {
      gl_FragColor = vec4(1,0,1,1);
              }
  
  `;