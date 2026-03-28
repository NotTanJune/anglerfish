import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function TickingBomb({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    // Shake with urgency
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 12) * 0.1
    groupRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.05)
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Fuse spark */}
      <pointLight position={[0, 0.7, 0]} color={glowColor} intensity={2} distance={3} decay={2} />
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
    </group>
  )
}
