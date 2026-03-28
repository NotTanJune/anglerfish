import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function PricePhantom({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  const coinPositions = useMemo(
    () =>
      Array.from({ length: 6 }, () => ({
        x: (Math.random() - 0.5) * 1.5,
        y: (Math.random() - 0.5) * 1,
        speed: 0.5 + Math.random(),
      })),
    []
  )

  useFrame((state) => {
    if (!groupRef.current) return
    // Phantom flickers in and out
    const opacity = 0.15 + Math.sin(state.clock.elapsedTime * 3) * 0.1
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.opacity = opacity
      }
    })
  })

  return (
    <group ref={groupRef}>
      {/* Nearly invisible body */}
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.15} />
      </mesh>
      {/* Cloak */}
      <mesh position={[0, -0.3, 0]}>
        <coneGeometry args={[0.5, 0.7, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.1} />
      </mesh>
      {/* Gold coins draining away */}
      {coinPositions.map((coin, i) => (
        <mesh key={i} position={[coin.x, coin.y, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.02, 8]} />
          <meshBasicMaterial color="#ffd700" />
        </mesh>
      ))}
      <pointLight position={[0, 0, 0.5]} color={glowColor} intensity={0.5} distance={2} />
    </group>
  )
}
