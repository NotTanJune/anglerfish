import { useMemo, useRef, useEffect } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { Random } from '../utils/random'

const GRID_SIZE = 64
const STARS_COUNT = 10000
const MAX_OFFSET = 0.43
const STARS_SEED = 87
const SKY_SPEED = 0.05

function generateStarField(): THREE.DataTexture {
  const starsMap = new Uint8Array(GRID_SIZE * GRID_SIZE * 24)
  const random = new Random(STARS_SEED)

  function vector3ToStarMap(dir: THREE.Vector3, value: number[]) {
    const absDir = new THREE.Vector3(Math.abs(dir.x), Math.abs(dir.y), Math.abs(dir.z))
    let maxAxis = 0, u = 0, v = 0, idx = 0

    if (dir.x > 0 && absDir.x >= absDir.y && absDir.x >= absDir.z) { maxAxis = absDir.x; u = -dir.z; v = dir.y; idx = 0 }
    if (dir.x <= 0 && absDir.x >= absDir.y && absDir.x >= absDir.z) { maxAxis = absDir.x; u = dir.z; v = dir.y; idx = 1 }
    if (dir.y > 0 && absDir.y >= absDir.x && absDir.y >= absDir.z) { maxAxis = absDir.y; u = dir.x; v = -dir.z; idx = 2 }
    if (dir.y <= 0 && absDir.y >= absDir.x && absDir.y >= absDir.z) { maxAxis = absDir.y; u = dir.x; v = dir.z; idx = 3 }
    if (dir.z > 0 && absDir.z >= absDir.x && absDir.z >= absDir.y) { maxAxis = absDir.z; u = dir.x; v = dir.y; idx = 4 }
    if (dir.z <= 0 && absDir.z >= absDir.x && absDir.z >= absDir.y) { maxAxis = absDir.z; u = -dir.x; v = dir.y; idx = 5 }

    const uu = Math.floor((u / maxAxis + 1) * 0.5 * GRID_SIZE)
    const vv = Math.floor((v / maxAxis + 1) * 0.5 * GRID_SIZE)
    const j = (vv * GRID_SIZE * 6 + idx * GRID_SIZE + uu) * 4
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

export type OceanUniforms = Record<string, THREE.IUniform>

export function useOceanUniforms() {
  const ditherTexture = useLoader(THREE.TextureLoader, '/assets/bluenoise.png')

  useEffect(() => {
    ditherTexture.wrapS = THREE.RepeatWrapping
    ditherTexture.wrapT = THREE.RepeatWrapping
  }, [ditherTexture])

  const { uniforms, axis } = useMemo(() => {
    const stars = generateStarField()
    const rotAxis = new THREE.Vector3(0, 0, 1).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      THREE.MathUtils.degToRad(-30)
    )

    const u: OceanUniforms = {
      _SkyRotationMatrix: { value: new THREE.Matrix3() },
      _DitherTexture: { value: ditherTexture },
      _DitherTextureSize: { value: new THREE.Vector2(ditherTexture.image?.width || 256, ditherTexture.image?.height || 256) },
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

    return { uniforms: u, axis: rotAxis }
  }, [ditherTexture])

  const angleRef = useRef(0.5)
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])

  function update(delta: number) {
    angleRef.current += delta * SKY_SPEED

    const cos = Math.cos(angleRef.current)
    const cos1 = 1 - cos
    const sin = Math.sin(angleRef.current)
    const u = axis
    const u2 = axis.clone().multiply(axis)

    uniforms._SkyRotationMatrix.value.set(
      cos + u2.x * cos1, u.x * u.y * cos1 - u.z * sin, u.x * u.z * cos1 + u.y * sin,
      u.y * u.x * cos1 + u.z * sin, cos + u2.y * cos1, u.y * u.z * cos1 - u.x * sin,
      u.z * u.x * cos1 - u.y * sin, u.z * u.y * cos1 + u.x * sin, cos + u2.z * cos1,
    )

    const initial = new THREE.Vector3(0, 1, 0).applyMatrix3(uniforms._SkyRotationMatrix.value)
    uniforms._DirToLight.value.set(-initial.x, initial.y, -initial.z)

    const intensity = uniforms._DirToLight.value.dot(up)
    uniforms._SunVisibility.value = THREE.MathUtils.clamp((intensity + 0.1) * 2, 0, 1)
    uniforms._TwilightTime.value = THREE.MathUtils.clamp((intensity + 0.1) * 3, 0, 1)
    uniforms._TwilightVisibility.value = 1 - Math.min(Math.abs(intensity * 3), 1)
    uniforms._SpecularVisibility.value = Math.sqrt(uniforms._SunVisibility.value)

    const l = Math.min(uniforms._SunVisibility.value + 0.333, 1)
    uniforms._Light.value.set(l, l, l)
  }

  return { uniforms, update }
}
