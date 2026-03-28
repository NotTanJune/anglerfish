import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

interface Props {
  depth: number
  sourceText: string
  onComplete: () => void
}

type BossPhase = 'dormant' | 'lure' | 'reveal' | 'display' | 'fade'

export function AnglerFishBoss({ depth, sourceText, onComplete }: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const lureRef = useRef<THREE.PointLight>(null)
  const { camera } = useThree()
  const [phase, setPhase] = useState<BossPhase>('dormant')
  const timerRef = useRef(0)

  const worldY = -(depth * 0.1)

  useFrame((_, delta) => {
    const cameraDepth = -camera.position.y * 10
    const distToDepth = depth - cameraDepth

    switch (phase) {
      case 'dormant':
        if (distToDepth < 30) {
          setPhase('lure')
          timerRef.current = 2.5
        }
        break

      case 'lure':
        timerRef.current -= delta
        // Pulse the lure
        if (lureRef.current) {
          lureRef.current.intensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3
        }
        if (timerRef.current <= 0) {
          setPhase('reveal')
          timerRef.current = 1.5
        }
        break

      case 'reveal':
        timerRef.current -= delta
        if (lureRef.current) {
          lureRef.current.intensity = THREE.MathUtils.lerp(
            lureRef.current.intensity,
            3,
            delta * 2
          )
        }
        if (timerRef.current <= 0) {
          setPhase('display')
          timerRef.current = 5
        }
        break

      case 'display':
        timerRef.current -= delta
        if (lureRef.current) {
          lureRef.current.intensity = 2 + Math.sin(Date.now() * 0.003) * 0.5
        }
        if (timerRef.current <= 0) {
          setPhase('fade')
          timerRef.current = 2
        }
        break

      case 'fade':
        timerRef.current -= delta
        if (lureRef.current) {
          lureRef.current.intensity *= 0.95
        }
        if (timerRef.current <= 0) {
          onComplete()
        }
        break
    }
  })

  const showBody = phase === 'reveal' || phase === 'display' || phase === 'fade'

  return (
    <group ref={groupRef} position={[0, worldY, 0]}>
      {/* The lure, always present but only visible when lit */}
      <pointLight
        ref={lureRef}
        position={[0, 1.5, 2]}
        color="#00ff88"
        intensity={phase === 'dormant' ? 0 : 0.5}
        distance={8}
        decay={2}
      />

      {/* Lure orb */}
      {phase !== 'dormant' && (
        <mesh position={[0, 1.5, 2]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#00ff88" />
        </mesh>
      )}

      {/* Anglerfish body */}
      {showBody && (
        <>
          {/* Main body */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[1.5, 8, 8]} />
            <meshStandardMaterial color="#003322" roughness={0.8} />
          </mesh>
          {/* Jaw */}
          <mesh position={[0, -0.8, 1]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[1.8, 0.3, 1.2]} />
            <meshStandardMaterial color="#002211" />
          </mesh>
          {/* Teeth */}
          {[-0.6, -0.3, 0, 0.3, 0.6].map((x, i) => (
            <mesh key={i} position={[x, -0.5, 1.5]}>
              <coneGeometry args={[0.05, 0.2, 4]} />
              <meshBasicMaterial color="#ccddcc" />
            </mesh>
          ))}
          {/* Eyes */}
          <mesh position={[-0.5, 0.4, 1.2]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#ff2200" />
          </mesh>
          <mesh position={[0.5, 0.4, 1.2]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color="#ff2200" />
          </mesh>
          {/* Stalk for lure */}
          <mesh position={[0, 1, 1]} rotation={[0.5, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.5]} />
            <meshStandardMaterial color="#004433" />
          </mesh>

          {/* Body glow */}
          <pointLight position={[0, 0, 1]} color="#00ff88" intensity={0.5} distance={4} />
        </>
      )}

      {/* Info display */}
      {phase === 'display' && (
        <Html position={[0, 3, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              border: '2px solid #00ff88',
              padding: '12px 20px',
              borderRadius: 4,
              textAlign: 'center',
              minWidth: 220,
            }}
          >
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.6rem',
                color: '#00ff88',
                marginBottom: 6,
              }}
            >
              ANGLERFISH
            </p>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.35rem',
                color: '#ff4444',
                marginBottom: 6,
              }}
            >
              BAIT & SWITCH
            </p>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.6rem',
                color: '#ccc',
                maxWidth: 280,
                lineHeight: 1.4,
                whiteSpace: 'normal',
              }}
            >
              "{sourceText}"
            </p>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.3rem',
                color: '#ffcc00',
                marginTop: 8,
              }}
            >
              THE PRETTY LIGHT IS ALWAYS BAIT
            </p>
          </div>
        </Html>
      )}
    </group>
  )
}
