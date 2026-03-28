import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { surfaceVertex, surfaceFragment, volumeVertex, volumeFragment } from '../shaders/oceanShaders'

interface Props {
  skyUniforms: Record<string, THREE.IUniform>
}

const HALF_SIZE = 1500
const DEPTH = 1000

export function OceanSurface({ skyUniforms }: Props) {
  const surfaceRef = useRef<THREE.Mesh>(null)
  const volumeRef = useRef<THREE.Mesh>(null)
  const { camera, clock } = useThree()

  const normalMap1 = useLoader(THREE.TextureLoader, '/assets/waterNormal1.png')
  const normalMap2 = useLoader(THREE.TextureLoader, '/assets/waterNormal2.png')

  useEffect(() => {
    normalMap1.wrapS = THREE.RepeatWrapping
    normalMap1.wrapT = THREE.RepeatWrapping
    normalMap2.wrapS = THREE.RepeatWrapping
    normalMap2.wrapT = THREE.RepeatWrapping
  }, [normalMap1, normalMap2])

  const { surfaceGeo, volumeGeo, surfaceUniforms, volumeUniforms } = useMemo(() => {
    // Surface plane at y=0
    const sVerts = new Float32Array([
      -HALF_SIZE, 0, -HALF_SIZE,
      HALF_SIZE, 0, -HALF_SIZE,
      -HALF_SIZE, 0, HALF_SIZE,
      HALF_SIZE, 0, HALF_SIZE,
    ])
    const sIdx = [2, 3, 0, 3, 1, 0]
    const sGeo = new THREE.BufferGeometry()
    sGeo.setAttribute('position', new THREE.BufferAttribute(sVerts, 3))
    sGeo.setIndex(sIdx)

    // Volume box below surface
    const vVerts = new Float32Array([
      -HALF_SIZE, -DEPTH, -HALF_SIZE,
      HALF_SIZE, -DEPTH, -HALF_SIZE,
      -HALF_SIZE, -DEPTH, HALF_SIZE,
      HALF_SIZE, -DEPTH, HALF_SIZE,
      -HALF_SIZE, 0, -HALF_SIZE,
      HALF_SIZE, 0, -HALF_SIZE,
      -HALF_SIZE, 0, HALF_SIZE,
      HALF_SIZE, 0, HALF_SIZE,
    ])
    const vIdx = [
      2, 3, 0, 3, 1, 0,
      0, 1, 4, 1, 5, 4,
      1, 3, 5, 3, 7, 5,
      3, 2, 7, 2, 6, 7,
      2, 0, 6, 0, 4, 6,
    ]
    const vGeo = new THREE.BufferGeometry()
    vGeo.setAttribute('position', new THREE.BufferAttribute(vVerts, 3))
    vGeo.setIndex(vIdx)

    const timeUniform = { value: 0 }

    const sUniforms = {
      _Time: timeUniform,
      _NormalMap1: { value: normalMap1 },
      _NormalMap2: { value: normalMap2 },
      ...skyUniforms,
    }

    const vUniforms = { ...skyUniforms }

    return {
      surfaceGeo: sGeo,
      volumeGeo: vGeo,
      surfaceUniforms: sUniforms,
      volumeUniforms: vUniforms,
    }
  }, [normalMap1, normalMap2, skyUniforms])

  useFrame(() => {
    if (!surfaceRef.current) return

    surfaceUniforms._Time.value = clock.elapsedTime
    surfaceRef.current.position.set(camera.position.x, 0, camera.position.z)

    if (volumeRef.current) {
      volumeRef.current.position.set(camera.position.x, 0, camera.position.z)
    }
  })

  return (
    <>
      <mesh ref={surfaceRef} geometry={surfaceGeo}>
        <shaderMaterial
          vertexShader={surfaceVertex}
          fragmentShader={surfaceFragment}
          uniforms={surfaceUniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={volumeRef} geometry={volumeGeo}>
        <shaderMaterial
          vertexShader={volumeVertex}
          fragmentShader={volumeFragment}
          uniforms={volumeUniforms}
        />
      </mesh>
    </>
  )
}
