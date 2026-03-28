import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function ScarcitySkeleton({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2
  })

  return (
    <group ref={groupRef}>
      {/* Skull */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#ddd8c4" />
      </mesh>
      {/* Eye sockets */}
      <mesh position={[-0.08, 0.85, 0.2]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.08, 0.85, 0.2]}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Ribcage */}
      {[0.4, 0.2, 0].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.4, 0.06, 0.2]} />
          <meshStandardMaterial color="#ccc8b4" />
        </mesh>
      ))}
      {/* Spine */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8]} />
        <meshStandardMaterial color="#bbb8a4" />
      </mesh>
      {/* Holding a shrinking gold item */}
      <mesh position={[0.4, 0.3, 0]}>
        <boxGeometry args={[0.15, 0.15, 0.15]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      <pointLight position={[0.4, 0.3, 0]} color={glowColor} intensity={0.5} distance={2} />
    </group>
  )
}
