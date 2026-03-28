import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props { color: string; glowColor: string }

export function ShapeShifter({ color, glowColor }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    // Morph between shapes by scaling axes independently
    meshRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.4
    meshRef.current.scale.y = 1 + Math.cos(t * 1.2) * 0.3
    meshRef.current.scale.z = 1 + Math.sin(t * 0.8 + 1) * 0.2
    meshRef.current.rotation.y += 0.02
    meshRef.current.rotation.x = Math.sin(t * 0.5) * 0.3
  })

  return (
    <group>
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color={color}
          wireframe={Math.random() > 0.5}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Fake "health pickup" cross that flickers */}
      <mesh position={[0, 0, 0.3]}>
        <boxGeometry args={[0.3, 0.08, 0.02]} />
        <meshBasicMaterial color="#44ff44" />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <boxGeometry args={[0.08, 0.3, 0.02]} />
        <meshBasicMaterial color="#44ff44" />
      </mesh>
      <pointLight position={[0, 0, 0.5]} color={glowColor} intensity={1} distance={3} />
    </group>
  )
}
