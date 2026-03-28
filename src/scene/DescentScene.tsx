import { Canvas } from '@react-three/fiber'
import { EffectComposer, Pixelation } from '@react-three/postprocessing'
import { OceanEnvironment } from './OceanEnvironment'
import { PlayerDiver } from './PlayerDiver'
import { Particles } from './Particles'
import { EncounterManager } from './Encounter'
import { DescentCamera } from './DescentCamera'
import type { Encounter } from '../types'

interface Props {
  encounters: Encounter[]
  isDescending: boolean
  onDepthChange: (depth: number) => void
  onEncounterComplete: (id: string) => void
  onDescentComplete: () => void
}

export function DescentScene({
  encounters,
  isDescending,
  onDepthChange,
  onEncounterComplete,
  onDescentComplete,
}: Props) {
  const maxDepth = encounters.length > 0
    ? Math.max(...encounters.map((e) => e.depth)) + 100
    : 500

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas
        gl={{ antialias: false }}
        camera={{ position: [0, 0, 10], fov: 60 }}
      >
        <DescentCamera
          isDescending={isDescending}
          encounters={encounters}
          maxDepth={maxDepth}
          onDepthChange={onDepthChange}
          onDescentComplete={onDescentComplete}
        />
        <OceanEnvironment depth={0} />
        <PlayerDiver />
        <Particles />
        <EncounterManager
          encounters={encounters}
          onEncounterComplete={onEncounterComplete}
        />
        <EffectComposer>
          <Pixelation granularity={5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
