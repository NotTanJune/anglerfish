import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function RiddleSphinx({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const eyeRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.15

    // Pulsing eyes
    if (eyeRef.current) {
      eyeRef.current.intensity = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.5
    }
  })

  return (
    <group ref={groupRef}>
      {/* Pyramid body */}
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.5, 0.9, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Face on pyramid */}
      {/* Eyes */}
      <mesh position={[-0.12, 0.15, 0.35]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
      <mesh position={[0.12, 0.15, 0.35]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
      <pointLight ref={eyeRef} position={[0, 0.15, 0.4]} color={glowColor} intensity={1} distance={3} />
      {/* Question mark floating above */}
      <mesh position={[0, 0.7, 0]}>
        <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI * 1.5]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshBasicMaterial color={glowColor} />
      </mesh>
    </group>
  )
}
