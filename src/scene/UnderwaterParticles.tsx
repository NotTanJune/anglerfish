import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 300

export function UnderwaterParticles() {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera } = useThree()

  const positions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60
      pos[i * 3 + 1] = -Math.random() * 200
      pos[i * 3 + 2] = (Math.random() - 0.5) * 60
    }
    return pos
  }, [])

  useFrame((_, delta) => {
    if (!pointsRef.current) return

    const geo = pointsRef.current.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const camY = camera.position.y

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Bubbles rise slowly
      posAttr.array[i * 3 + 1] += delta * (0.3 + Math.random() * 0.2)
      // Slight drift
      posAttr.array[i * 3] += Math.sin(Date.now() * 0.0005 + i) * delta * 0.15

      // Wrap around camera view
      const py = posAttr.array[i * 3 + 1]
      if (py > camY + 30) {
        posAttr.array[i * 3 + 1] = camY - 30
        posAttr.array[i * 3] = camera.position.x + (Math.random() - 0.5) * 60
        posAttr.array[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 60
      }
      if (py < camY - 30) {
        posAttr.array[i * 3 + 1] = camY + 30
      }

      // Only show particles below water (y < 0)
      if (posAttr.array[i * 3 + 1] > 0) {
        posAttr.array[i * 3 + 1] = camY - Math.random() * 30
      }
    }
    posAttr.needsUpdate = true

    // Fade particles with depth
    const depthFactor = Math.max(0, Math.min(1, -camY / 100))
    const mat = pointsRef.current.material as THREE.PointsMaterial
    mat.opacity = 0.4 - depthFactor * 0.3
    mat.size = 0.08 - depthFactor * 0.04
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#88ccff"
        transparent
        opacity={0.4}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
