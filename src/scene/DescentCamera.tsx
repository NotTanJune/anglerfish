import { useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Encounter } from '../types'

interface Props {
  isDescending: boolean
  encounters: Encounter[]
  maxDepth: number
  onDepthChange: (depth: number) => void
  onDescentComplete: () => void
}

export function DescentCamera({
  isDescending,
  encounters,
  maxDepth,
  onDepthChange,
  onDescentComplete,
}: Props) {
  const { camera } = useThree()
  const depthRef = useRef(0)
  const speedRef = useRef(15) // units per second
  const pausedRef = useRef(false)
  const pauseTimerRef = useRef(0)
  const completedRef = useRef(false)
  const activeEncounterRef = useRef<string | null>(null)

  const checkEncounters = useCallback(
    (depth: number) => {
      for (const enc of encounters) {
        if (
          !enc.triggered &&
          !enc.completed &&
          depth >= enc.depth &&
          activeEncounterRef.current === null
        ) {
          enc.triggered = true
          activeEncounterRef.current = enc.id
          pausedRef.current = true
          pauseTimerRef.current = 3 // seconds
          return
        }
      }
    },
    [encounters]
  )

  useFrame((_, delta) => {
    if (!isDescending) return

    if (pausedRef.current) {
      pauseTimerRef.current -= delta
      if (pauseTimerRef.current <= 0) {
        pausedRef.current = false
        if (activeEncounterRef.current) {
          // This is a simplified version; the real encounter completion
          // happens via the Encounter component
        }
        activeEncounterRef.current = null
      }
      return
    }

    depthRef.current += speedRef.current * delta
    const depth = depthRef.current

    // Move camera down (negative Y in Three.js world)
    camera.position.y = -depth * 0.1

    onDepthChange(depth)
    checkEncounters(depth)

    if (depth >= maxDepth && !completedRef.current) {
      completedRef.current = true
      onDescentComplete()
    }
  })

  return null
}
