import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

const GHOST_POSITIONS = [
  [-0.6, 0, 0], [0.4, 0.3, -0.2], [-0.2, -0.3, 0.1],
  [0.7, -0.1, -0.3], [-0.5, 0.4, 0.2],
] as const

export function GhostHorde({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.children.forEach((child, i) => {
      child.position.y =
        GHOST_POSITIONS[i]?.[1] ?? 0 +
        Math.sin(state.clock.elapsedTime * 1.5 + i * 1.2) * 0.15
    })
  })

  return (
    <group ref={groupRef}>
      {GHOST_POSITIONS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.4}
            />
          </mesh>
          {/* Eyes */}
          <mesh position={[-0.05, 0.05, 0.17]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color="#000" />
          </mesh>
          <mesh position={[0.05, 0.05, 0.17]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0, 0.5]} color={glowColor} intensity={0.8} distance={3} />
    </group>
  )
}
