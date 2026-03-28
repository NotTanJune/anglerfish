import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function AnglerFishMonster({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const lureRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1

    if (lureRef.current) {
      lureRef.current.intensity = 1.5 + Math.sin(state.clock.elapsedTime * 2) * 0.5
    }
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      {/* Jaw */}
      <mesh position={[0, -0.3, 0.4]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.7, 0.15, 0.5]} />
        <meshStandardMaterial color="#001a11" />
      </mesh>
      {/* Teeth */}
      {[-0.2, -0.1, 0, 0.1, 0.2].map((x, i) => (
        <mesh key={i} position={[x, -0.15, 0.6]}>
          <coneGeometry args={[0.02, 0.12, 4]} />
          <meshBasicMaterial color="#aaccaa" />
        </mesh>
      ))}
      {/* Lure stalk */}
      <mesh position={[0, 0.5, 0.3]} rotation={[0.4, 0, 0]}>
        <cylinderGeometry args={[0.015, 0.01, 0.6]} />
        <meshStandardMaterial color="#004433" />
      </mesh>
      {/* Lure light */}
      <mesh position={[0, 0.85, 0.5]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
      <pointLight ref={lureRef} position={[0, 0.85, 0.5]} color={glowColor} intensity={1.5} distance={4} />
      {/* Eyes */}
      <mesh position={[-0.2, 0.15, 0.5]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#ff2200" />
      </mesh>
      <mesh position={[0.2, 0.15, 0.5]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial color="#ff2200" />
      </mesh>
    </group>
  )
}
