var raytraceFS = `

struct Ray {
	vec3 pos;
	vec3 dir;
};

struct Material {
	vec3  k_d;	// diffuse coefficient
	vec3  k_s;	// specular coefficient
	float n;	// specular exponent
};

struct Sphere {
	vec3     center;
	float    radius;
	Material mtl;
};

struct Light {
	vec3 position;
	vec3 intensity;
};

struct HitInfo {
	float    t;
	vec3     position;
	vec3     normal;
	Material mtl;
};

uniform Sphere spheres[ NUM_SPHERES ];
uniform Light  lights [ NUM_LIGHTS  ];
uniform samplerCube envMap;
uniform int bounceLimit;

bool IntersectRay( inout HitInfo hit, Ray ray );

// Shades the given point and returns the computed color.
vec3 Shade( Material mtl, vec3 position, vec3 normal, vec3 view )
{
	vec3 color = vec3(0,0,0);
	for ( int i=0; i<NUM_LIGHTS; ++i ) {		
		// Check for shadows
		Ray shadowRay;
		shadowRay.pos = position + 0.001 * normal; // + bias
		shadowRay.dir = lights[i].position - position;					
		HitInfo shadowHit;
		if (IntersectRay(shadowHit, shadowRay)) continue;	
		// If not shadowed, perform shading using the Blinn model
		vec3 LightDir = normalize( lights[i].position - position );
		vec3 HalfDir = normalize( LightDir + view );
		float phiCos = max( dot( HalfDir, normal ), 0.0 );
		float thetaCos = max( dot( normal, LightDir ), 0.0 );
		vec3 diffuse = mtl.k_d * thetaCos;
		vec3 specular = mtl.k_s * pow( phiCos, mtl.n );
		color += (diffuse + specular)*lights[i].intensity;				
	}
	return color;
}

// Intersects the given ray with all spheres in the scene
// and updates the given HitInfo using the information of the sphere
// that first intersects with the ray.
// Returns true if an intersection is found.
bool IntersectRay( inout HitInfo hit, Ray ray )
{
	hit.t = 1e30;
	bool foundHit = false;
	for ( int i=0; i<NUM_SPHERES; ++i ) {		
		// Test for ray-sphere intersection
		float a = dot(ray.dir, ray.dir);
		float b = 2.0 * dot(ray.dir, ray.pos - spheres[i].center);
		float c = dot(ray.pos - spheres[i].center, ray.pos - spheres[i].center) - spheres[i].radius * spheres[i].radius;
		float delta = b*b - 4.0*a*c;
		if (delta < 0.0) continue;		
		float root = (-b -sqrt(delta)) / (2.0*a);		
		if (root < 0.0 || root > hit.t ) continue;		
		// If intersection is found, update the given HitInfo		
		hit.t = root;
		hit.position = ray.pos + root*ray.dir;
		hit.normal = normalize(hit.position -spheres[i].center);
		hit.mtl = spheres[i].mtl;
		foundHit = true;						
	}
	return foundHit;
}

// Given a ray, returns the shaded color where the ray intersects a sphere.
// If the ray does not hit a sphere, returns the environment color.
vec4 RayTracer( Ray ray )
{
	HitInfo hit;	
	if ( IntersectRay( hit, ray ) ) {		
		// Ray hit a sphere, so shade the hit point
		vec3 view = normalize( -ray.dir );
		vec3 clr = Shade( hit.mtl, hit.position, hit.normal, view );
				
		vec3 k_s = hit.mtl.k_s;	
		Ray currRay = ray;
		for ( int bounce=0; bounce<MAX_BOUNCES; ++bounce ) {
			if ( bounce >= bounceLimit ) break;
			if ( hit.mtl.k_s.r + hit.mtl.k_s.g + hit.mtl.k_s.b <= 0.0 ) break;
			
			Ray W_r;	// this is the reflection ray
			HitInfo reflHit;	// reflection hit info
			
			// Initialize the reflection ray			
			W_r.pos = hit.position + 0.001 * hit.normal; // + bias						
			W_r.dir = reflect( currRay.dir, hit.normal );
			//W_r.dir = 2.0 * dot( currRay.dir, hit.normal ) * hit.normal - currRay.dir;										

			if ( IntersectRay( reflHit, W_r ) ) {				
				// Hit found, so shade the hit point
				vec3 ReflClr = Shade( reflHit.mtl, reflHit.position, reflHit.normal, view );
				clr += k_s * ReflClr;				
				// Update the loop variables for tracing the next reflection ray		
				currRay = W_r;				
				hit = reflHit;
				k_s = reflHit.mtl.k_s;				
				view = normalize(-W_r.dir);				

			} else {
				// The refleciton ray did not intersect with anything,
				// so we are using the environment color
				clr += k_s * textureCube( envMap, W_r.dir.xzy ).rgb;
				break;	// no more reflections
			}
		}
		return vec4( clr, 1 );	// return the accumulated color, including the reflections
	} else {
		return vec4( textureCube( envMap, ray.dir.xzy ).rgb, 0 );	// return the environment color
	}
}
`;
