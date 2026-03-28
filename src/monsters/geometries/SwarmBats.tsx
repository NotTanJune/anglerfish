import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function SwarmBats({ color, glowColor }: Props) {
  const groupRef = useRef<THREE.Group>(null)

  const batOffsets = useMemo(
    () =>
      Array.from({ length: 8 }, () => ({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 1.5,
        z: (Math.random() - 0.5) * 1,
        speed: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      })),
    []
  )

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const bat = batOffsets[i]
      if (!bat) return
      child.position.x = bat.x + Math.sin(t * bat.speed + bat.phase) * 0.5
      child.position.y = bat.y + Math.cos(t * bat.speed * 0.7 + bat.phase) * 0.3
    })
  })

  return (
    <group ref={groupRef}>
      {batOffsets.map((bat, i) => (
        <group key={i} position={[bat.x, bat.y, bat.z]}>
          {/* Body */}
          <mesh>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Wings */}
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, 0.3]}>
            <planeGeometry args={[0.12, 0.06]} />
            <meshStandardMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, -0.3]}>
            <planeGeometry args={[0.12, 0.06]} />
            <meshStandardMaterial color={color} side={THREE.DoubleSide} />
          </mesh>
          {/* Red notification badge */}
          <mesh position={[0.08, 0.06, 0.05]}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0, 0.5]} color={glowColor} intensity={0.5} distance={2} />
    </group>
  )
}
