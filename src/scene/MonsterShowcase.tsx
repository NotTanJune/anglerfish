import { Html } from '@react-three/drei'
import { MonsterFactory } from '../monsters/MonsterFactory'
import { MONSTERS } from '../config/monsters'
import { TAXONOMY } from '../config/taxonomy'
import type { PatternType } from '../types'

const SHOWCASE_POSITIONS: { type: PatternType; x: number; z: number; depth: number }[] = [
  { type: 'urgency', x: 3, z: -5, depth: 10 },
  { type: 'scarcity', x: -4, z: -8, depth: 20 },
  { type: 'misdirection', x: 5, z: -3, depth: 30 },
  { type: 'social_proof', x: -3, z: -6, depth: 40 },
  { type: 'nagging', x: 4, z: -4, depth: 50 },
  { type: 'forced_action', x: -5, z: -7, depth: 65 },
  { type: 'sneaking', x: 3, z: -5, depth: 80 },
  { type: 'confirmshaming', x: -4, z: -3, depth: 95 },
  { type: 'disguised_ads', x: 5, z: -6, depth: 110 },
  { type: 'obstruction', x: -3, z: -8, depth: 130 },
  { type: 'trick_questions', x: 4, z: -4, depth: 150 },
  { type: 'hidden_costs', x: -5, z: -5, depth: 170 },
  { type: 'bait_and_switch', x: 0, z: -3, depth: 200 },
]

export function MonsterShowcase() {
  return (
    <group>
      {SHOWCASE_POSITIONS.map(({ type, x, z, depth }) => {
        const monster = MONSTERS[type]
        const taxonomy = TAXONOMY[type]
        return (
          <group key={type} position={[x, -depth, z]}>
            <MonsterFactory
              patternType={type}
              color={monster.color}
              glowColor={monster.glowColor}
            />
            <Html
              position={[0, 1.5, 0]}
              center
              style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
            >
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.75)',
                  border: `1px solid ${monster.color}`,
                  padding: '4px 10px',
                  borderRadius: 3,
                  textAlign: 'center',
                }}
              >
                <p style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '0.4rem',
                  color: monster.color,
                  margin: 0,
                }}>
                  {taxonomy.emoji} {monster.monster_name}
                </p>
                <p style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '0.25rem',
                  color: '#888',
                  margin: '2px 0 0',
                }}>
                  {taxonomy.name} | Depth: {depth}m
                </p>
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}
