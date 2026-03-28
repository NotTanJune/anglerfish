import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function WallTrap({ color, glowColor }: Props) {
  const leftRef = useRef<THREE.Mesh>(null)
  const rightRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    const squeeze = Math.sin(state.clock.elapsedTime * 1.5) * 0.5 + 0.8
    if (leftRef.current) leftRef.current.position.x = -squeeze
    if (rightRef.current) rightRef.current.position.x = squeeze
  })

  return (
    <group>
      <mesh ref={leftRef} position={[-1, 0, 0]}>
        <boxGeometry args={[0.2, 1.5, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh ref={rightRef} position={[1, 0, 0]}>
        <boxGeometry args={[0.2, 1.5, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Spikes on walls */}
      {[-0.3, 0, 0.3].map((y, i) => (
        <group key={i}>
          <mesh position={[-0.7, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.04, 0.2, 4]} />
            <meshStandardMaterial color="#888" />
          </mesh>
          <mesh position={[0.7, y, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.04, 0.2, 4]} />
            <meshStandardMaterial color="#888" />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0, 0.5]} color={glowColor} intensity={0.5} distance={2} />
    </group>
  )
}
