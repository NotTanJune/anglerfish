import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { EffectComposer, Pixelation } from '@react-three/postprocessing'
import * as THREE from 'three'
import { ShaderInit } from './ShaderInit'
import { SkyboxMesh } from './SkyboxMesh'
import { OceanSurface } from './OceanSurface'
import { UnderwaterParticles } from './UnderwaterParticles'
import { MonsterShowcase } from './MonsterShowcase'
import { FirstPersonCamera } from './FirstPersonCamera'
import type { Encounter } from '../types'
import { EncounterManager } from './Encounter'

interface Props {
  encounters: Encounter[]
  isDescending: boolean
  onDepthChange: (depth: number) => void
  onEncounterComplete: (id: string) => void
  onDescentComplete: () => void
  showMonsterShowcase?: boolean
}

function OceanContents({
  encounters,
  isDescending,
  onDepthChange,
  onEncounterComplete,
  onDescentComplete,
  showMonsterShowcase,
  skyUniforms,
}: Props & { skyUniforms: Record<string, THREE.IUniform> }) {
  const maxDepth = encounters.length > 0
    ? Math.max(...encounters.map((e) => e.depth)) + 100
    : 250

  return (
    <>
      <FirstPersonCamera
        isDescending={isDescending}
        encounters={encounters}
        maxDepth={maxDepth}
        onDepthChange={onDepthChange}
        onDescentComplete={onDescentComplete}
      />
      <OceanSurface skyUniforms={skyUniforms} />
      <UnderwaterParticles />
      {showMonsterShowcase && <MonsterShowcase />}
      <EncounterManager
        encounters={encounters}
        onEncounterComplete={onEncounterComplete}
      />
    </>
  )
}

function SkyboxWithSharedUniforms(props: Props) {
  // SkyboxMesh creates and manages its own uniforms.
  // We need to share them with OceanSurface.
  // We use a wrapper that renders both and passes uniforms.
  return <SkyboxAndOcean {...props} />
}

function SkyboxAndOcean(props: Props) {
  // Create shared skybox uniforms that both skybox and ocean use
  const ditherTexture = useLoader(THREE.TextureLoader, '/assets/bluenoise.png')

  const skyUniforms = useMemo(() => {
    ditherTexture.wrapS = THREE.RepeatWrapping
    ditherTexture.wrapT = THREE.RepeatWrapping

    return {
      _SkyRotationMatrix: { value: new THREE.Matrix3() },
      _DitherTexture: { value: ditherTexture },
      _DitherTextureSize: { value: new THREE.Vector2(256, 256) },
      _SunVisibility: { value: 1.0 },
      _TwilightTime: { value: 0.0 },
      _TwilightVisibility: { value: 0.0 },
      _MoonVisibility: { value: 0.0 },
      _GridSize: { value: 64 },
      _GridSizeScaled: { value: 64 * 6 },
      _Stars: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) },
      _SpecularVisibility: { value: 1.0 },
      _DirToLight: { value: new THREE.Vector3(0, 1, 0) },
      _Light: { value: new THREE.Vector3(1, 1, 1) },
    }
  }, [ditherTexture])

  return (
    <>
      <SkyboxMesh />
      <OceanContents {...props} skyUniforms={skyUniforms} />
    </>
  )
}

export function OceanScene(props: Props) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas
        gl={{ antialias: false }}
        camera={{ position: [0, 2, 0], fov: 70, near: 0.3, far: 4000 }}
      >
        <ShaderInit />
        <Suspense fallback={null}>
          <SkyboxWithSharedUniforms {...props} />
        </Suspense>
        <EffectComposer>
          <Pixelation granularity={5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
