import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function FloorTrap({ color, glowColor }: Props) {
  const spikesRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!spikesRef.current) return
    const rise = Math.max(0, Math.sin(state.clock.elapsedTime * 2)) * 0.4
    spikesRef.current.position.y = -0.3 + rise
  })

  return (
    <group>
      {/* Floor plate */}
      <mesh position={[0, -0.35, 0]}>
        <boxGeometry args={[1.2, 0.1, 0.6]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      {/* Spikes */}
      <group ref={spikesRef}>
        {[-0.4, -0.2, 0, 0.2, 0.4].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]}>
            <coneGeometry args={[0.04, 0.4, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 0.2, 0.3]} color={glowColor} intensity={0.5} distance={2} />
    </group>
  )
}
