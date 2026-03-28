import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function LockedDoor({ color, glowColor }: Props) {
  const lockRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!lockRef.current) return
    // Lock jiggles as if someone is trying to open it
    lockRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.1
  })

  return (
    <group>
      {/* Door */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.8, 1.2, 0.1]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Door frame */}
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[0.95, 1.35, 0.05]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Lock */}
      <mesh ref={lockRef} position={[0.25, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.05, 8]} />
        <meshStandardMaterial color="#aa8800" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Keyhole */}
      <mesh position={[0.25, -0.05, 0.09]}>
        <circleGeometry args={[0.02, 6]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <pointLight position={[0, 0, 0.5]} color={glowColor} intensity={0.5} distance={2} />
    </group>
  )
}
