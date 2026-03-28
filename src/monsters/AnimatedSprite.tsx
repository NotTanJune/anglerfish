import { useRef, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  spriteSheet: string
  frameCount: number
  columns?: number
  rows?: number
  fps?: number
  scale?: [number, number]
  position?: [number, number, number]
}

export function AnimatedSprite({
  spriteSheet,
  frameCount,
  columns,
  rows = 1,
  fps = 8,
  scale = [1, 1],
  position = [0, 0, 0],
}: Props) {
  const texture = useLoader(THREE.TextureLoader, spriteSheet)
  const frameRef = useRef(0)
  const timerRef = useRef(0)

  const cols = columns ?? frameCount

  useEffect(() => {
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.repeat.set(1 / cols, 1 / rows)
  }, [texture, cols, rows])

  useFrame((_, delta) => {
    timerRef.current += delta
    if (timerRef.current >= 1 / fps) {
      timerRef.current = 0
      frameRef.current = (frameRef.current + 1) % frameCount

      const col = frameRef.current % cols
      const row = Math.floor(frameRef.current / cols)

      texture.offset.x = col / cols
      texture.offset.y = 1 - (row + 1) / rows
    }
  })

  return (
    <mesh position={position}>
      <planeGeometry args={[scale[0], scale[1]]} />
      <meshBasicMaterial map={texture} transparent alphaTest={0.5} />
    </mesh>
  )
}
