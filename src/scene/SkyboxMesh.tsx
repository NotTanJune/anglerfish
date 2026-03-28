import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { skyboxVertex, skyboxFragment } from '../shaders/skyboxShader'
import { Random } from '../utils/random'

const HALF_SIZE = 2000
const SKY_SPEED = 0.05
const GRID_SIZE = 64
const STARS_COUNT = 10000
const MAX_OFFSET = 0.43
const STARS_SEED = 87

function generateStarField(): THREE.DataTexture {
  const starsMap = new Uint8Array(GRID_SIZE * GRID_SIZE * 24)
  const random = new Random(STARS_SEED)

  function vector3ToStarMap(dir: THREE.Vector3, value: number[]) {
    const absDir = new THREE.Vector3(Math.abs(dir.x), Math.abs(dir.y), Math.abs(dir.z))
    let maxAxis = 0, u = 0, v = 0, i = 0

    if (dir.x > 0 && absDir.x >= absDir.y && absDir.x >= absDir.z) { maxAxis = absDir.x; u = -dir.z; v = dir.y; i = 0 }
    if (dir.x <= 0 && absDir.x >= absDir.y && absDir.x >= absDir.z) { maxAxis = absDir.x; u = dir.z; v = dir.y; i = 1 }
    if (dir.y > 0 && absDir.y >= absDir.x && absDir.y >= absDir.z) { maxAxis = absDir.y; u = dir.x; v = -dir.z; i = 2 }
    if (dir.y <= 0 && absDir.y >= absDir.x && absDir.y >= absDir.z) { maxAxis = absDir.y; u = dir.x; v = dir.z; i = 3 }
    if (dir.z > 0 && absDir.z >= absDir.x && absDir.z >= absDir.y) { maxAxis = absDir.z; u = dir.x; v = dir.y; i = 4 }
    if (dir.z <= 0 && absDir.z >= absDir.x && absDir.z >= absDir.y) { maxAxis = absDir.z; u = -dir.x; v = dir.y; i = 5 }

    const uu = Math.floor((u / maxAxis + 1) * 0.5 * GRID_SIZE)
    const vv = Math.floor((v / maxAxis + 1) * 0.5 * GRID_SIZE)
    const j = (vv * GRID_SIZE * 6 + i * GRID_SIZE + uu) * 4
    starsMap[j] = value[0]
    starsMap[j + 1] = value[1]
    starsMap[j + 2] = value[2]
    starsMap[j + 3] = value[3]
  }

  for (let i = 0; i < STARS_COUNT; i++) {
    const a = random.next() * Math.PI * 2
    const b = random.next() * 2 - 1
    const c = Math.sqrt(1 - b * b)
    const target = new THREE.Vector3(Math.cos(a) * c, Math.sin(a) * c, b)
    vector3ToStarMap(target, [
      THREE.MathUtils.lerp(0.5 - MAX_OFFSET, 0.5 + MAX_OFFSET, random.next()) * 255,
      THREE.MathUtils.lerp(0.5 - MAX_OFFSET, 0.5 + MAX_OFFSET, random.next()) * 255,
      Math.pow(random.next(), 6) * 255,
      random.next() * 255,
    ])
  }

  const tex = new THREE.DataTexture(starsMap, GRID_SIZE * 6, GRID_SIZE)
  tex.needsUpdate = true
  return tex
}

export function SkyboxMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()

  const ditherTexture = useLoader(THREE.TextureLoader, '/assets/bluenoise.png')

  useEffect(() => {
    ditherTexture.wrapS = THREE.RepeatWrapping
    ditherTexture.wrapT = THREE.RepeatWrapping
  }, [ditherTexture])

  const { geometry, starsTex, uniforms, axis } = useMemo(() => {
    const hs = HALF_SIZE
    const vertices = new Float32Array([
      -hs, -hs, -hs, hs, -hs, -hs, -hs, -hs, hs, hs, -hs, hs,
      -hs, hs, -hs, hs, hs, -hs, -hs, hs, hs, hs, hs, hs,
    ])
    const indices = [
      2, 3, 0, 3, 1, 0,
      0, 1, 4, 1, 5, 4,
      1, 3, 5, 3, 7, 5,
      3, 2, 7, 2, 6, 7,
      2, 0, 6, 0, 4, 6,
      4, 5, 6, 5, 7, 6,
    ]

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geo.setAttribute('coord', new THREE.BufferAttribute(vertices.slice(), 3))
    geo.setIndex(indices)

    const stars = generateStarField()
    const rotAxis = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(-30))

    const u = {
      _SkyRotationMatrix: { value: new THREE.Matrix3() },
      _DitherTexture: { value: ditherTexture },
      _DitherTextureSize: { value: new THREE.Vector2(256, 256) },
      _SunVisibility: { value: 1.0 },
      _TwilightTime: { value: 0.0 },
      _TwilightVisibility: { value: 0.0 },
      _MoonVisibility: { value: 0.0 },
      _GridSize: { value: GRID_SIZE },
      _GridSizeScaled: { value: GRID_SIZE * 6 },
      _Stars: { value: stars },
      _SpecularVisibility: { value: 1.0 },
      _DirToLight: { value: new THREE.Vector3(0, 1, 0) },
      _Light: { value: new THREE.Vector3(1, 1, 1) },
    }

    return { geometry: geo, starsTex: stars, uniforms: u, axis: rotAxis }
  }, [ditherTexture])

  const angleRef = useRef(-1)
  const initialRef = useRef(new THREE.Vector3(0, 1, 0))
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    angleRef.current += delta * SKY_SPEED

    const cos = Math.cos(angleRef.current)
    const cos1 = 1 - cos
    const sin = Math.sin(angleRef.current)
    const u = axis
    const u2 = axis.clone().multiply(axis)

    const mat = uniforms._SkyRotationMatrix.value
    mat.set(
      cos + u2.x * cos1, u.x * u.y * cos1 - u.z * sin, u.x * u.z * cos1 + u.y * sin,
      u.y * u.x * cos1 + u.z * sin, cos + u2.y * cos1, u.y * u.z * cos1 - u.x * sin,
      u.z * u.x * cos1 - u.y * sin, u.z * u.y * cos1 + u.x * sin, cos + u2.z * cos1,
    )

    initialRef.current.set(0, 1, 0).applyMatrix3(mat)
    const dirToLight = uniforms._DirToLight.value
    dirToLight.set(-initialRef.current.x, initialRef.current.y, -initialRef.current.z)

    const intensity = dirToLight.dot(up)
    uniforms._SunVisibility.value = THREE.MathUtils.clamp((intensity + 0.1) * 2, 0, 1)
    uniforms._TwilightTime.value = THREE.MathUtils.clamp((intensity + 0.1) * 3, 0, 1)
    uniforms._TwilightVisibility.value = 1 - Math.min(Math.abs(intensity * 3), 1)
    uniforms._SpecularVisibility.value = Math.sqrt(uniforms._SunVisibility.value)

    const l = Math.min(uniforms._SunVisibility.value + 0.333, 1)
    uniforms._Light.value.set(l, l, l)

    meshRef.current.position.copy(camera.position)
  })

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={skyboxVertex}
        fragmentShader={skyboxFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

// Export uniforms accessor for other components
export function getSkyboxUniforms(uniforms: Record<string, THREE.IUniform>) {
  // This is called by ocean materials to share skybox uniforms
  return uniforms
}
