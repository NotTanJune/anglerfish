import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function GuiltyGhost({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const tearRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.2
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.05

    // Tear drop animation
    if (tearRef.current) {
      const t = (state.clock.elapsedTime * 0.8) % 1
      tearRef.current.position.y = -0.1 - t * 0.5
      tearRef.current.scale.setScalar(1 - t * 0.8)
    }
  })

  return (
    <group ref={groupRef}>
      {/* Ghost body */}
      <mesh>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Ghost tail */}
      <mesh position={[0, -0.5, 0]}>
        <coneGeometry args={[0.35, 0.5, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.4} />
      </mesh>
      {/* Sad eyes */}
      <mesh position={[-0.12, 0.08, 0.35]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.12, 0.08, 0.35]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Sad mouth */}
      <mesh position={[0, -0.08, 0.38]}>
        <torusGeometry args={[0.06, 0.015, 8, 8, Math.PI]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Tear */}
      <mesh ref={tearRef} position={[0.12, -0.1, 0.35]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial color="#88aaff" />
      </mesh>
      <pointLight position={[0, 0, 0.5]} color={glowColor} intensity={0.8} distance={3} />
    </group>
  )
}
