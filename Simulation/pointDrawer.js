///////////////////////////////////////////////////////////////////////////////////
// Below is the code for the object that draws the selected vertex.
// disegna i puntini rossi che identificano i Vertici
// con i quali si può interagire
///////////////////////////////////////////////////////////////////////////////////
class PointDrawer {
	constructor()
	{
		// Compile the shader program
		this.prog = InitShaderProgram( pointVS, pointFS );
		
		// Get the ids of the uniform variables in the shaders
		this.mvp = gl.getUniformLocation( this.prog, 'mvp' );

		// Get the ids of the vertex attributes in the shaders
		this.vertPos = gl.getAttribLocation( this.prog, 'pos' );
		
		// Create the buffer objects
		this.vertbuffer = gl.createBuffer();
	}
	setPoint(p)
	{
		if ( this.selVertex == p ) return false;
		this.selVertex = p;
		this.updatePoint();
		return true;
	}
	updatePoint()
	{
		if ( this.selVertex !== undefined ) {
			var pos = [ this.selVertex.x, this.selVertex.y, this.selVertex.z ];
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
		}
	}
	draw( trans )
	{
		if ( this.selVertex ) {
			gl.useProgram( this.prog );
			gl.uniformMatrix4fv( this.mvp, false, trans );
			gl.bindBuffer( gl.ARRAY_BUFFER, this.vertbuffer );
			gl.vertexAttribPointer( this.vertPos, 3, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( this.vertPos );
			gl.disable(gl.DEPTH_TEST);
			gl.drawArrays( gl.POINTS, 0, 1 );
			gl.enable(gl.DEPTH_TEST);
		}
	}
}
// Vertex shader source code
var pointVS = `
	attribute vec3 pos;
	uniform mat4 mvp;
	void main()
	{
		gl_Position = mvp * vec4(pos,1);
		gl_PointSize = 10.0;
	}
`;
// Fragment shader source code
var pointFS = `
	precision mediump float;
	void main()
	{
		
		//gl_FragColor = vec4(1,gl_FragCoord.z*gl_FragCoord.z,0,1);
		gl_FragColor = vec4(1,0,0,1);
	}
`;
