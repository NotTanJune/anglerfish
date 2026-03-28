import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Encounter } from '../types'

interface Props {
  isDescending: boolean
  encounters: Encounter[]
  maxDepth: number
  onDepthChange: (depth: number) => void
  onDescentComplete: () => void
}

export function FirstPersonCamera({
  isDescending,
  encounters,
  maxDepth,
  onDepthChange,
  onDescentComplete,
}: Props) {
  const { camera } = useThree()
  const depthRef = useRef(0)
  const speedRef = useRef(5)
  const pausedRef = useRef(false)
  const pauseTimerRef = useRef(0)
  const completedRef = useRef(false)
  const yawRef = useRef(0)
  const keysRef = useRef({ left: false, right: false })

  // Camera starts above water looking forward/down
  useEffect(() => {
    camera.position.set(0, 2, 0)
    camera.rotation.set(-0.3, 0, 0) // Slight downward look
  }, [camera])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true
      if (e.code === 'Space' && pausedRef.current) {
        pauseTimerRef.current = 0
      }
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
    if (!isDescending) return

    // Handle encounter pauses
    if (pausedRef.current) {
      pauseTimerRef.current -= delta
      if (pauseTimerRef.current <= 0) {
        pausedRef.current = false
      }
      return
    }

    // Descend
    depthRef.current += speedRef.current * delta

    // Accelerate slightly as we go deeper
    speedRef.current = 5 + depthRef.current * 0.02

    // Camera descends (negative Y)
    const targetY = -depthRef.current
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 2)

    // Slight left/right yaw
    if (keysRef.current.left) yawRef.current += delta * 0.8
    if (keysRef.current.right) yawRef.current -= delta * 0.8
    yawRef.current *= 0.95 // Damping

    // Look slightly downward, allow yaw
    const pitchAngle = -0.3 - Math.min(depthRef.current * 0.001, 0.2) // More downward as we go deeper
    camera.rotation.set(pitchAngle, yawRef.current, 0)

    // Gentle forward drift
    camera.position.z -= delta * 0.5

    onDepthChange(depthRef.current)

    // Check encounters
    for (const enc of encounters) {
      if (!enc.triggered && !enc.completed && depthRef.current >= enc.depth) {
        enc.triggered = true
        pausedRef.current = true
        pauseTimerRef.current = 4
        break
      }
    }

    // Check completion
    if (depthRef.current >= maxDepth && !completedRef.current) {
      completedRef.current = true
      onDescentComplete()
    }
  })

  return (
    <>
      {/* Helmet spotlight attached to camera */}
      <spotLight
        position={camera.position}
        target-position={[
          camera.position.x,
          camera.position.y - 10,
          camera.position.z - 5,
        ]}
        color="#88ffcc"
        intensity={2}
        distance={50}
        angle={0.6}
        penumbra={0.5}
        decay={2}
      />
    </>
  )
}
