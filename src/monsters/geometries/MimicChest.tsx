import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function MimicChest({ color, glowColor }: Props) {
  const lidRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!lidRef.current) return
    // Snap open and shut
    const t = state.clock.elapsedTime
    lidRef.current.rotation.x = Math.abs(Math.sin(t * 1.5)) * -0.8
  })

  return (
    <group>
      {/* Chest body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Lid */}
      <mesh ref={lidRef} position={[0, 0.2, -0.25]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.1, 0.5]} />
        <meshStandardMaterial color="#6b3a1f" />
      </mesh>
      {/* Teeth inside */}
      {[-0.2, 0, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.15, 0.2]}>
          <coneGeometry args={[0.04, 0.15, 4]} />
          <meshBasicMaterial color="#fff" />
        </mesh>
      ))}
      {/* Red eyes */}
      <mesh position={[-0.15, 0.15, 0.26]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <mesh position={[0.15, 0.15, 0.26]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>
      <pointLight position={[0, 0.3, 0]} color={glowColor} intensity={1} distance={3} />
    </group>
  )
}
