import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Encounter } from '../types'
import { TAXONOMY } from '../config/taxonomy'
import { MonsterFactory } from '../monsters/MonsterFactory'

interface EncounterManagerProps {
  encounters: Encounter[]
  onEncounterComplete: (id: string) => void
}

export function EncounterManager({ encounters, onEncounterComplete }: EncounterManagerProps) {
  return (
    <>
      {encounters.map((enc) => (
        <EncounterInstance
          key={enc.id}
          encounter={enc}
          onComplete={() => onEncounterComplete(enc.id)}
        />
      ))}
    </>
  )
}

interface EncounterInstanceProps {
  encounter: Encounter
  onComplete: () => void
}

type Phase = 'waiting' | 'entering' | 'active' | 'exiting' | 'done'

function EncounterInstance({ encounter, onComplete }: EncounterInstanceProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [phase, setPhase] = useState<Phase>('waiting')
  const timerRef = useRef(0)
  const xRef = useRef(8) // Start off-screen right

  const worldY = -(encounter.depth * 0.1)
  const taxonomy = TAXONOMY[encounter.pattern.pattern_type]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'active') {
        setPhase('exiting')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  useFrame((_, delta) => {
    if (!groupRef.current) return

    const cameraDepth = -camera.position.y * 10
    const distToEncounter = encounter.depth - cameraDepth

    switch (phase) {
      case 'waiting':
        if (distToEncounter < 20 && distToEncounter > -5) {
          setPhase('entering')
          xRef.current = 8
        }
        break

      case 'entering':
        xRef.current = THREE.MathUtils.lerp(xRef.current, 2.5, delta * 3)
        if (Math.abs(xRef.current - 2.5) < 0.1) {
          setPhase('active')
          timerRef.current = 4 // auto-advance after 4s
        }
        break

      case 'active':
        timerRef.current -= delta
        if (timerRef.current <= 0) {
          setPhase('exiting')
        }
        break

      case 'exiting':
        xRef.current = THREE.MathUtils.lerp(xRef.current, -8, delta * 4)
        if (xRef.current < -6) {
          setPhase('done')
          onComplete()
        }
        break
    }

    groupRef.current.position.set(xRef.current, worldY, 0)
  })

  if (phase === 'done') return null

  const showLabel = phase === 'active' || phase === 'entering'

  return (
    <group ref={groupRef} position={[8, worldY, 0]}>
      <MonsterFactory
        patternType={encounter.pattern.pattern_type}
        color={encounter.monster.color}
        glowColor={encounter.monster.glowColor}
      />

      {showLabel && (
        <Html
          position={[0, 1.5, 0]}
          center
          style={{
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.85)',
              border: `1px solid ${encounter.monster.color}`,
              padding: '8px 14px',
              borderRadius: 4,
              textAlign: 'center',
              minWidth: 180,
            }}
          >
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.5rem',
                color: encounter.monster.color,
                marginBottom: 4,
              }}
            >
              {taxonomy.emoji} {taxonomy.name.toUpperCase()}
            </p>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: '0.3rem',
                color: '#ffcc00',
                marginBottom: 4,
              }}
            >
              {'*'.repeat(encounter.pattern.severity)}
            </p>
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.6rem',
                color: '#ccc',
                maxWidth: 250,
                lineHeight: 1.4,
                wordBreak: 'break-word',
                whiteSpace: 'normal',
              }}
            >
              "{encounter.pattern.source_text}"
            </p>
          </div>
        </Html>
      )}
    </group>
  )
}
