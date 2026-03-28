import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/*
  Nugget8-inspired procedural skybox adapted for Three.js ShaderMaterial (GLSL ES 1.0).

  Key adaptations from the original:
  - const vec3 arrays replaced with lookup functions (GLSL ES 1.0 compat)
  - All code inlined (no custom #include chunks)
  - Uses Three.js #include <common> for pow2()
*/

const vertexShader = /*glsl*/ `
uniform mat3 _SkyRotationMatrix;
attribute vec3 coord;
varying vec3 vWorldPos;
varying vec3 vCoord;

void main() {
  vWorldPos = coord;
  vCoord = _SkyRotationMatrix * coord;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = /*glsl*/ `
#include <common>

// Sky colors
const vec3 DAY_SKY = vec3(0.25, 0.4, 0.6);
const vec3 DAY_HORIZON = vec3(0.75, 0.9, 1.0);
const vec3 NIGHT_SKY = vec3(0.06, 0.1, 0.15);
const vec3 NIGHT_HORIZON = vec3(0.07, 0.13, 0.18);
const vec3 EARLY_TWILIGHT = vec3(1.0, 0.83, 0.5);
const vec3 LATE_TWILIGHT = vec3(1.0, 0.333, 0.167);
const vec3 UP = vec3(0.0, 1.0, 0.0);

// Sun/moon
const float SUN_SHARPNESS = 2000.0;
const float SUN_SIZE = 5.0;
const float MOON_SHARPNESS = 12000.0;
const float MOON_SIZE = 5000.0;

// Stars
const float STARS_SHARPNESS = 50.0;
const float STARS_SIZE = 10.0;
const float STARS_FALLOFF = 15.0;
const float STARS_VISIBILITY = 450.0;
const float WIDTH_SCALE = 1.0 / 6.0;
const float WIDTH_SCALE_HALF = WIDTH_SCALE / 2.0;

// Dither
const float DITHER_STRENGTH = 0.1;

uniform float _SunVisibility;
uniform float _TwilightTime;
uniform float _TwilightVisibility;
uniform sampler2D _DitherTexture;
uniform vec2 _DitherTextureSize;
uniform float _GridSize;
uniform float _GridSizeScaled;
uniform sampler2D _Stars;

varying vec3 vWorldPos;
varying vec3 vCoord;

vec3 getStarColor(float idx) {
  if (idx < 1.0) return vec3(1.0, 0.95, 0.9);
  if (idx < 2.0) return vec3(1.0, 0.9, 0.9);
  if (idx < 3.0) return vec3(0.9, 1.0, 1.0);
  if (idx < 4.0) return vec3(0.9, 0.95, 1.0);
  if (idx < 5.0) return vec3(1.0, 0.9, 1.0);
  return vec3(1.0, 1.0, 1.0);
}

vec2 sampleCubeCoords(vec3 dir) {
  vec3 ad = abs(dir);
  float ma = 1.0, u = 0.0, v = 0.0, face = 0.0;

  if (dir.x > 0.0 && ad.x >= ad.y && ad.x >= ad.z) { ma=ad.x; u=-dir.z; v=dir.y; face=0.0; }
  if (dir.x <=0.0 && ad.x >= ad.y && ad.x >= ad.z) { ma=ad.x; u= dir.z; v=dir.y; face=1.0; }
  if (dir.y > 0.0 && ad.y >= ad.x && ad.y >= ad.z) { ma=ad.y; u= dir.x; v=-dir.z; face=2.0; }
  if (dir.y <=0.0 && ad.y >= ad.x && ad.y >= ad.z) { ma=ad.y; u= dir.x; v= dir.z; face=3.0; }
  if (dir.z > 0.0 && ad.z >= ad.x && ad.z >= ad.y) { ma=ad.z; u= dir.x; v= dir.y; face=4.0; }
  if (dir.z <=0.0 && ad.z >= ad.x && ad.z >= ad.y) { ma=ad.z; u=-dir.x; v= dir.y; face=5.0; }

  u = face * WIDTH_SCALE + (u / ma + 1.0) * WIDTH_SCALE_HALF;
  v = (v / ma + 1.0) * 0.5;
  return vec2(u, v);
}

void main() {
  vec3 worldDir = normalize(vWorldPos);
  vec3 viewDir = normalize(vCoord);

  // Dither to reduce banding
  float dither = (texture2D(_DitherTexture, (gl_FragCoord.xy - vec2(0.5)) / _DitherTextureSize).x - 0.5) * DITHER_STRENGTH;

  // Horizon density (1 at horizon, 0 at zenith)
  float density = clamp(pow2(1.0 - max(0.0, dot(worldDir, UP) + dither)), 0.0, 1.0);

  // Sun position
  float sunLight = dot(viewDir, UP);
  float sun = min(pow(max(0.0, sunLight), SUN_SHARPNESS) * SUN_SIZE, 1.0);

  // Moon
  float moonLight = -sunLight;
  float moon = min(pow(max(0.0, moonLight), MOON_SHARPNESS) * MOON_SIZE, 1.0);

  // Mix day/night/twilight
  vec3 day = mix(DAY_SKY, DAY_HORIZON, density);
  vec3 twilight = mix(LATE_TWILIGHT, EARLY_TWILIGHT, _TwilightTime);
  vec3 night = mix(NIGHT_SKY, NIGHT_HORIZON, density);

  vec3 sky = mix(night, day, _SunVisibility);
  sky = mix(sky, twilight, density * clamp(sunLight * 0.5 + 0.5 + dither, 0.0, 1.0) * _TwilightVisibility);

  // Stars
  vec2 cubeCoords = sampleCubeCoords(viewDir);
  vec4 gridValue = texture2D(_Stars, cubeCoords);
  vec2 gridCoords = vec2(cubeCoords.x * _GridSizeScaled, cubeCoords.y * _GridSize);
  vec2 gridCenter = floor(gridCoords) + gridValue.xy;
  float stars = max(min(pow(1.0 - min(distance(gridCoords, gridCenter), 1.0), STARS_SHARPNESS) * gridValue.z * STARS_SIZE, 1.0), moon);
  stars *= min(exp(-dot(sky, vec3(1.0)) * STARS_FALLOFF) * STARS_VISIBILITY, 1.0);

  sky = mix(sky, max(getStarColor(gridValue.w * 6.0), vec3(moon)), stars);
  sky = mix(sky, vec3(1.0), sun);

  gl_FragColor = vec4(sky, 1.0);
}
`

export function NuggetSkybox({ uniforms }: { uniforms: Record<string, THREE.IUniform> }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const { geometry, material } = useMemo(() => {
    const hs = 2000
    const verts = new Float32Array([
      -hs, -hs, -hs, hs, -hs, -hs, -hs, -hs, hs, hs, -hs, hs,
      -hs, hs, -hs, hs, hs, -hs, -hs, hs, hs, hs, hs, hs,
    ])
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    geo.setAttribute('coord', new THREE.BufferAttribute(verts.slice(), 3))
    geo.setIndex([
      2, 3, 0, 3, 1, 0,
      0, 1, 4, 1, 5, 4,
      1, 3, 5, 3, 7, 5,
      3, 2, 7, 2, 6, 7,
      2, 0, 6, 0, 4, 6,
      4, 5, 6, 5, 7, 6,
    ])
    geo.computeBoundingSphere()

    // Create material imperatively so uniforms are set at construction time
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
    })

    return { geometry: geo, material: mat }
  }, [uniforms])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position)
    }
  })

  return <mesh ref={meshRef} geometry={geometry} material={material} />
}
