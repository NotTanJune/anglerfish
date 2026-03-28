import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 200

export function Particles() {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()

  const positions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16     // x spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30  // y spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8   // z spread
    }
    return pos
  }, [])

  const sizes = useMemo(() => {
    const s = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      s[i] = Math.random() * 0.08 + 0.02
    }
    return s
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const geo = pointsRef.current.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const camY = camera.position.y

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Bubbles rise
      posAttr.array[i * 3 + 1] += delta * (0.2 + Math.random() * 0.1)
      // Slight horizontal drift
      posAttr.array[i * 3] += Math.sin(Date.now() * 0.001 + i) * delta * 0.1

      // Wrap particles around camera view
      if (posAttr.array[i * 3 + 1] > camY + 15) {
        posAttr.array[i * 3 + 1] = camY - 15
        posAttr.array[i * 3] = (Math.random() - 0.5) * 16
      }
      if (posAttr.array[i * 3 + 1] < camY - 15) {
        posAttr.array[i * 3 + 1] = camY + 15
      }
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#88ccff"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
