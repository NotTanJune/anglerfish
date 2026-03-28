import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DEPTH_ZONES } from '../config/depthZones'

interface Props {
  depth: number
}

export function OceanEnvironment({ depth: _depth }: Props) {
  const { scene, camera } = useThree()
  const fogRef = useRef<THREE.FogExp2 | null>(null)

  // Initialize fog
  if (!fogRef.current) {
    fogRef.current = new THREE.FogExp2('#1a6fc4', 0.01)
    scene.fog = fogRef.current
  }

  useFrame(() => {
    const depth = -camera.position.y * 10 // Convert camera Y back to depth

    // Find current zone and interpolate
    let fogColor = '#1a6fc4'
    let fogDensity = 0.01
    let ambientIntensity = 0.8

    for (let i = DEPTH_ZONES.length - 1; i >= 0; i--) {
      const zone = DEPTH_ZONES[i]
      if (depth >= zone.startDepth) {
        const nextZone = DEPTH_ZONES[Math.min(i + 1, DEPTH_ZONES.length - 1)]
        const range = zone.endDepth === Infinity ? 500 : zone.endDepth - zone.startDepth
        const t = Math.min(1, (depth - zone.startDepth) / range)

        fogColor = zone.fogColor
        fogDensity = THREE.MathUtils.lerp(zone.fogDensity, nextZone.fogDensity, t)
        ambientIntensity = THREE.MathUtils.lerp(zone.ambientIntensity, nextZone.ambientIntensity, t)
        break
      }
    }

    if (fogRef.current) {
      fogRef.current.color.set(fogColor)
      fogRef.current.density = fogDensity
    }
    scene.background = new THREE.Color(fogColor)

    // Update ambient light (accessed via scene children)
  })

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[0, 10, 5]} intensity={0.3} color="#88ccff" />
    </>
  )
}
