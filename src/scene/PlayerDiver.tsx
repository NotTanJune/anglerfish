import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function PlayerDiver() {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const velocityRef = useRef(0)
  const posXRef = useRef(0)
  const keysRef = useRef({ left: false, right: false })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const keys = keysRef.current
    const accel = 40
    const friction = 0.9
    const maxSpeed = 8
    const bounds = 4

    if (keys.left) velocityRef.current -= accel * delta
    if (keys.right) velocityRef.current += accel * delta

    velocityRef.current *= friction
    velocityRef.current = THREE.MathUtils.clamp(velocityRef.current, -maxSpeed, maxSpeed)

    posXRef.current += velocityRef.current * delta
    posXRef.current = THREE.MathUtils.clamp(posXRef.current, -bounds, bounds)

    // Follow camera Y position, offset slightly downward
    groupRef.current.position.set(
      posXRef.current,
      camera.position.y - 1,
      0
    )

    // Slight tilt based on velocity
    groupRef.current.rotation.z = -velocityRef.current * 0.03
  })

  return (
    <group ref={groupRef}>
      {/* Diver body */}
      <mesh>
        <capsuleGeometry args={[0.15, 0.3, 4, 8]} />
        <meshStandardMaterial color="#2266aa" />
      </mesh>
      {/* Helmet */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#88ccff" />
      </mesh>
      {/* Visor glow */}
      <mesh position={[0, 0.3, 0.1]}>
        <circleGeometry args={[0.08, 8]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>
      {/* Flippers */}
      <mesh position={[0, -0.35, 0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.3, 0.05, 0.25]} />
        <meshStandardMaterial color="#224488" />
      </mesh>
      {/* Diver light */}
      <pointLight
        position={[0, 0.3, 0.5]}
        color="#88ffcc"
        intensity={1}
        distance={5}
        decay={2}
      />
    </group>
  )
}
