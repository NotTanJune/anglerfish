import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import type { Encounter } from '../types'

interface Props {
  depth: number
  encounters: Encounter[]
  started: boolean
  activeEncounterIndex: number
  showAnglerfish?: boolean
  onSceneReady?: () => void
}

// ── Voronoi caustic shader (based on Shadertoy MdlXz8 / Maxime Heckel) ──

const causticVertex = /*glsl*/ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const causticFragment = /*glsl*/ `
varying vec3 vWorldPos;
uniform float time;
uniform float intensity;

// Hash function for Voronoi
vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453) * 2.0 - 1.0;
}

// Voronoi distance field
float voronoi(vec2 x, float t) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float md = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash(n + g);
      o = 0.5 + 0.5 * sin(t * 0.7 + 6.2831 * o);
      vec2 r = g + o - f;
      float d = dot(r, r);
      md = min(md, d);
    }
  }
  return sqrt(md);
}

void main() {
  vec2 uv = vWorldPos.xz * 0.02; // World-space tiling

  // Two Voronoi layers at different scales for organic caustic lines
  float v1 = voronoi(uv * 3.0, time * 0.8);
  float v2 = voronoi(uv * 4.5 + 1.7, time * 0.6 + 3.0);

  // Caustic = bright where Voronoi cells meet (small distance)
  float caustic = pow(1.0 - v1, 3.0) * 0.6 + pow(1.0 - v2, 3.0) * 0.4;
  caustic = pow(caustic, 1.5) * intensity;

  vec3 col = vec3(caustic * 0.4, caustic * 0.7, caustic * 0.9);
  gl_FragColor = vec4(col, caustic * 0.5);
}
`

export function OceanBackground({ depth, encounters, started, activeEncounterIndex, showAnglerfish, onSceneReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ depth: 0, started: false, activeIdx: -1, showAnglerfish: false })
  const frameIdRef = useRef(0)
  const encountersRef = useRef(encounters)
  const onSceneReadyRef = useRef(onSceneReady)
  useEffect(() => { onSceneReadyRef.current = onSceneReady }, [onSceneReady])

  useEffect(() => { stateRef.current.depth = depth }, [depth])
  useEffect(() => { stateRef.current.started = started }, [started])
  useEffect(() => { stateRef.current.activeIdx = activeEncounterIndex }, [activeEncounterIndex])
  useEffect(() => { encountersRef.current = encounters }, [encounters])
  useEffect(() => { stateRef.current.showAnglerfish = !!showAnglerfish }, [showAnglerfish])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5
    container.appendChild(renderer.domElement)

    // ── Scene & Camera ──
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 20000)
    camera.position.set(0, 30, 100)

    const sun = new THREE.Vector3()

    // ── Water surface ──
    const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load('/assets/waterNormal1.png', (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping
      }),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: false,
    })
    water.rotation.x = -Math.PI / 2
    scene.add(water)

    // ── Sky ──
    const sky = new Sky()
    sky.scale.setScalar(10000)
    scene.add(sky)

    const skyUniforms = sky.material.uniforms
    skyUniforms['turbidity'].value = 10
    skyUniforms['rayleigh'].value = 2
    skyUniforms['mieCoefficient'].value = 0.005
    skyUniforms['mieDirectionalG'].value = 0.8

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const sceneEnv = new THREE.Scene()
    let renderTarget: THREE.WebGLRenderTarget | undefined

    function updateSun(elevation: number, azimuth: number) {
      const phi = THREE.MathUtils.degToRad(90 - elevation)
      const theta = THREE.MathUtils.degToRad(azimuth)
      sun.setFromSphericalCoords(1, phi, theta)
      sky.material.uniforms['sunPosition'].value.copy(sun)
      water.material.uniforms['sunDirection'].value.copy(sun).normalize()
      if (renderTarget) renderTarget.dispose()
      sceneEnv.add(sky)
      renderTarget = pmremGenerator.fromScene(sceneEnv)
      scene.add(sky)
      scene.environment = renderTarget.texture
    }
    updateSun(2, 180)

    // ── Underwater color overlay (camera-attached tint plane) ──
    // Instead of hiding sky, we tint the view with increasing opacity
    const tintGeo = new THREE.PlaneGeometry(200, 200)
    const tintMat = new THREE.MeshBasicMaterial({
      color: 0x051530,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const tintPlane = new THREE.Mesh(tintGeo, tintMat)
    tintPlane.renderOrder = 999 // Render last (on top)
    scene.add(tintPlane)

    // ── Voronoi caustic planes ──
    const causticMat = new THREE.ShaderMaterial({
      vertexShader: causticVertex,
      fragmentShader: causticFragment,
      uniforms: { time: { value: 0 }, intensity: { value: 1.0 } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const causticPlanes: THREE.Mesh[] = []
    for (let i = 0; i < 4; i++) {
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), causticMat.clone())
      plane.rotation.x = -Math.PI / 2
      plane.position.y = -2 - i * 20
      plane.visible = false
      scene.add(plane)
      causticPlanes.push(plane)
    }

    // ── Underwater particles ──
    const particleCount = 600
    const pPos = new Float32Array(particleCount * 3)
    const pSpeeds = new Float32Array(particleCount)
    for (let i = 0; i < particleCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 300
      pPos[i * 3 + 1] = -Math.random() * 500
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 300
      pSpeeds[i] = 0.1 + Math.random() * 0.3
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({
      size: 0.4, color: 0x88ccff, transparent: true, opacity: 0,
      sizeAttenuation: true, depthWrite: false,
    })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // ── Monster glow lights at depth (sprites are in HTML overlay) ──
    const monsterLights: { light: THREE.PointLight; depth: number; baseY: number }[] = []

    function createMonsterLights() {
      const encs = encountersRef.current
      monsterLights.forEach(m => scene.remove(m.light))
      monsterLights.length = 0

      encs.forEach((enc, i) => {
        const worldY = -(enc.depth * 1.5 - 5)
        const light = new THREE.PointLight(enc.monster.glowColor, 2, 35, 2)
        const x = (i % 2 === 0 ? 1 : -1) * (3 + Math.sin(i * 1.7) * 2)
        const z = -5 + Math.cos(i * 2.3) * 3
        light.position.set(x, worldY, z)
        scene.add(light)
        monsterLights.push({ light, depth: enc.depth, baseY: worldY })
      })
    }

    setTimeout(createMonsterLights, 100)

    // ── Sea creatures (FBX models from SeaCreaturesPack) ──
    interface SeaCreature { mesh: THREE.Group; baseY: number; speed: number; phase: number; orbit: number; isJellyfish: boolean; depthFactor: number; pointLight: THREE.PointLight; mixer: THREE.AnimationMixer | null; baseScale: number }
    const seaCreatures: SeaCreature[] = []
    const fbxLoader = new FBXLoader()
    const textureLoader = new THREE.TextureLoader()

    // Texture map: FBX filename -> texture path
    const TEXTURE_MAP: Record<string, string> = {
      'ClowFish.fbx': '/assets/creatures/Textures/ClownFish.png',
      'SmallBlueFish.fbx': '/assets/creatures/Textures/SmallBlueFish.png',
      'SmallGreenFish.fbx': '/assets/creatures/Textures/SmallGreenFish.png',
      'SmallOrangeFish.fbx': '/assets/creatures/Textures/SmallOrangeFish.png',
      'SmallPinkFish.fbx': '/assets/creatures/Textures/SmallPinkFish.png',
      'SmallPurpleFish.fbx': '/assets/creatures/Textures/SmallPurpleFish.png',
      'SmallRedFish.fbx': '/assets/creatures/Textures/SmallRedFIsh.png',
      'SmallYellowFish.fbx': '/assets/creatures/Textures/SmallYellowFish.png',
      'SmallWhiteFish.fbx': '/assets/creatures/Textures/SmallWhiteFish.png',
      'SmallBlackFish.fbx': '/assets/creatures/Textures/SmallBlackFish.png',
      'MediumBrownFish.fbx': '/assets/creatures/Textures/MediumBrownFish.png',
      'MediumGrayFish.fbx': '/assets/creatures/Textures/MediumGrayFish.png',
      'MediumGreenFish.fbx': '/assets/creatures/Textures/MediumGreenFish.png',
      'MediumYellowFish.fbx': '/assets/creatures/Textures/MediumYellowFish.png',
      'Dolphin.fbx': '/assets/creatures/Textures/Dolphin.png',
      'SeaTurtle.fbx': '/assets/creatures/Textures/SeaTurtle.png',
      'Jellyfish.fbx': '/assets/creatures/Textures/Jellyfish.png',
      'HammerheadShark.fbx': '/assets/creatures/Textures/HammerheadShark.png',
      'TigerShark.fbx': '/assets/creatures/Textures/TigerShark.png',
      'WhiteShark.fbx': '/assets/creatures/Textures/WhiteShark.png',
      'PurpleOctopus.fbx': '/assets/creatures/Textures/PurpleOctopus.png',
      'OrangeOctopus.fbx': '/assets/creatures/Textures/OrangeOctopus.png',
      'RedOctopus.fbx': '/assets/creatures/Textures/RedOctopus.png',
      'KillerWhale.fbx': '/assets/creatures/Textures/KillerWhaleBaseColor.png',
      'BlueWhale.fbx': '/assets/creatures/Textures/BlueWhale.png',
      'AnglerFish.fbx': '/assets/creatures/Textures/AnglerFish.png',
    }

    // Creatures ordered by depth: small fish at top, dolphins mid-shallow,
    // octopus/turtles mid, sharks deep-mid, whales deep, jellyfish throughout
    const creatureConfig = [
      // Shallow (y: 0 to -80): colorful small fish schools
      { file: 'ClowFish.fbx', y: -8, x: 0, z: -18, scale: 0.025, speed: 0.4, light: 0xffaa44, orbit: 30 },
      { file: 'SmallOrangeFish.fbx', y: -12, x: 0, z: -15, scale: 0.02, speed: 0.5, light: 0xff8844, orbit: 25 },
      { file: 'SmallBlueFish.fbx', y: -18, x: 0, z: -22, scale: 0.025, speed: 0.5, light: 0x4488ff, orbit: 28 },
      { file: 'SmallPinkFish.fbx', y: -22, x: 0, z: -16, scale: 0.02, speed: 0.55, light: 0xff88bb, orbit: 22 },
      { file: 'SmallGreenFish.fbx', y: -28, x: 0, z: -20, scale: 0.02, speed: 0.45, light: 0x44cc66, orbit: 26 },
      { file: 'SmallYellowFish.fbx', y: -32, x: 0, z: -14, scale: 0.022, speed: 0.48, light: 0xffcc44, orbit: 24 },
      { file: 'ClowFish.fbx', y: -38, x: 0, z: -25, scale: 0.02, speed: 0.42, light: 0xffaa44, orbit: 32 },
      { file: 'SmallRedFish.fbx', y: -42, x: 0, z: -18, scale: 0.018, speed: 0.52, light: 0xff4444, orbit: 20 },
      { file: 'SmallPurpleFish.fbx', y: -48, x: 0, z: -20, scale: 0.02, speed: 0.46, light: 0xaa44ff, orbit: 27 },
      { file: 'SmallWhiteFish.fbx', y: -55, x: 0, z: -16, scale: 0.018, speed: 0.5, light: 0xccddee, orbit: 23 },
      // Mid-shallow (y: -50 to -120): dolphins, medium fish
      { file: 'Dolphin.fbx', y: -60, x: 0, z: -28, scale: 0.018, speed: 0.3, light: 0x88bbdd, orbit: 35 },
      { file: 'MediumGreenFish.fbx', y: -70, x: 0, z: -18, scale: 0.015, speed: 0.35, light: 0x44aa66, orbit: 28 },
      { file: 'Dolphin.fbx', y: -80, x: 0, z: -22, scale: 0.015, speed: 0.28, light: 0x77aacc, orbit: 30 },
      { file: 'MediumYellowFish.fbx', y: -85, x: 0, z: -16, scale: 0.015, speed: 0.38, light: 0xddaa44, orbit: 25 },
      { file: 'SmallBlueFish.fbx', y: -90, x: 0, z: -20, scale: 0.018, speed: 0.5, light: 0x4488ff, orbit: 22 },
      { file: 'MediumBrownFish.fbx', y: -100, x: 0, z: -14, scale: 0.015, speed: 0.32, light: 0x886644, orbit: 26 },
      { file: 'ClowFish.fbx', y: -110, x: 0, z: -22, scale: 0.015, speed: 0.4, light: 0xff9944, orbit: 24 },
      // Mid (y: -120 to -220): octopus, turtles, jellyfish
      { file: 'SeaTurtle.fbx', y: -130, x: 0, z: -24, scale: 0.018, speed: 0.12, light: 0x66aa88, orbit: 20 },
      { file: 'Jellyfish.fbx', y: -140, x: 0, z: -18, scale: 0.025, speed: 0.06, light: 0xaa44ff, orbit: 15 },
      { file: 'OrangeOctopus.fbx', y: -150, x: 0, z: -20, scale: 0.018, speed: 0.08, light: 0xff8844, orbit: 22 },
      { file: 'Jellyfish.fbx', y: -160, x: 0, z: -14, scale: 0.02, speed: 0.05, light: 0xcc66ff, orbit: 18 },
      { file: 'SeaTurtle.fbx', y: -175, x: 0, z: -26, scale: 0.015, speed: 0.1, light: 0x44aa66, orbit: 22 },
      { file: 'PurpleOctopus.fbx', y: -185, x: 0, z: -18, scale: 0.018, speed: 0.06, light: 0x8844ff, orbit: 20 },
      { file: 'Jellyfish.fbx', y: -195, x: 0, z: -16, scale: 0.018, speed: 0.07, light: 0xff44aa, orbit: 16 },
      { file: 'MediumGrayFish.fbx', y: -210, x: 0, z: -20, scale: 0.012, speed: 0.3, light: 0x889999, orbit: 25 },
      // Deep-mid (y: -220 to -340): sharks, more octopus/jellyfish
      { file: 'HammerheadShark.fbx', y: -230, x: 0, z: -30, scale: 0.015, speed: 0.2, light: 0x88aacc, orbit: 35 },
      { file: 'Jellyfish.fbx', y: -245, x: 0, z: -14, scale: 0.025, speed: 0.04, light: 0x00ffaa, orbit: 15 },
      { file: 'RedOctopus.fbx', y: -255, x: 0, z: -20, scale: 0.018, speed: 0.05, light: 0xff4444, orbit: 22 },
      { file: 'TigerShark.fbx', y: -270, x: 0, z: -32, scale: 0.012, speed: 0.18, light: 0x88aaaa, orbit: 38 },
      { file: 'Jellyfish.fbx', y: -285, x: 0, z: -16, scale: 0.02, speed: 0.035, light: 0xcc44ff, orbit: 18 },
      { file: 'WhiteShark.fbx', y: -300, x: 0, z: -35, scale: 0.012, speed: 0.15, light: 0xaabbcc, orbit: 40 },
      { file: 'Jellyfish.fbx', y: -315, x: 0, z: -12, scale: 0.022, speed: 0.03, light: 0x44ffaa, orbit: 16 },
      { file: 'PurpleOctopus.fbx', y: -330, x: 0, z: -22, scale: 0.015, speed: 0.04, light: 0xff4488, orbit: 20 },
      // Deep (y: -340 to -420): whales, jellyfish swarms
      { file: 'KillerWhale.fbx', y: -350, x: 0, z: -35, scale: 0.01, speed: 0.12, light: 0x6688aa, orbit: 40 },
      { file: 'Jellyfish.fbx', y: -365, x: 0, z: -14, scale: 0.02, speed: 0.03, light: 0xff66cc, orbit: 15 },
      { file: 'Jellyfish.fbx', y: -380, x: 0, z: -18, scale: 0.025, speed: 0.025, light: 0x00ffcc, orbit: 18 },
      { file: 'BlueWhale.fbx', y: -395, x: 0, z: -40, scale: 0.008, speed: 0.08, light: 0x4466aa, orbit: 45 },
      { file: 'Jellyfish.fbx', y: -410, x: 0, z: -12, scale: 0.02, speed: 0.03, light: 0x88ff44, orbit: 16 },
      // Abyss (y: -420+): bioluminescent jellyfish and octopus
      { file: 'Jellyfish.fbx', y: -430, x: 0, z: -14, scale: 0.025, speed: 0.025, light: 0x00ffcc, orbit: 15 },
      { file: 'PurpleOctopus.fbx', y: -445, x: 0, z: -20, scale: 0.02, speed: 0.03, light: 0xaa22ff, orbit: 20 },
      { file: 'Jellyfish.fbx', y: -460, x: 0, z: -16, scale: 0.022, speed: 0.02, light: 0xff2288, orbit: 18 },
      { file: 'Jellyfish.fbx', y: -475, x: 0, z: -12, scale: 0.02, speed: 0.025, light: 0x44ffff, orbit: 16 },
      { file: 'OrangeOctopus.fbx', y: -490, x: 0, z: -22, scale: 0.018, speed: 0.02, light: 0xff8844, orbit: 22 },
      { file: 'Jellyfish.fbx', y: -505, x: 0, z: -14, scale: 0.025, speed: 0.02, light: 0x22ffaa, orbit: 15 },
      { file: 'Jellyfish.fbx', y: -520, x: 0, z: -18, scale: 0.018, speed: 0.03, light: 0xff88cc, orbit: 16 },
      { file: 'RedOctopus.fbx', y: -535, x: 0, z: -20, scale: 0.015, speed: 0.025, light: 0xff4466, orbit: 20 },
      { file: 'Jellyfish.fbx', y: -550, x: 0, z: -12, scale: 0.02, speed: 0.02, light: 0x44ffff, orbit: 18 },
    ]

    creatureConfig.forEach((cfg, i) => {
      fbxLoader.load(`/assets/creatures/${cfg.file}`, (fbx) => {
        fbx.scale.setScalar(cfg.scale)
        fbx.position.set(cfg.x, cfg.y, cfg.z)

        // Depth-scaled bioluminescence: deeper = brighter glow
        const depthFactor = Math.min(1, Math.abs(cfg.y) / 500)
        const emissiveIntensity = 0.4 + depthFactor * 0.6 // always visible
        const lightIntensity = 2.0 + depthFactor * 4.0
        const lightDistance = 30 + depthFactor * 30

        // Pre-load texture synchronously if available
        const texturePath = TEXTURE_MAP[cfg.file]
        const tex = texturePath ? textureLoader.load(texturePath) : null
        if (tex) tex.colorSpace = THREE.SRGBColorSpace

        // Apply material with texture + emissive glow
        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              map: tex,
              color: tex ? 0xffffff : cfg.light,
              emissive: cfg.light,
              emissiveIntensity,
              roughness: 0.6,
              metalness: 0.05,
            })
          }
        })

        const light = new THREE.PointLight(cfg.light, lightIntensity, lightDistance, 2)
        fbx.add(light)

        // Play embedded FBX animation if present
        let mixer: THREE.AnimationMixer | null = null
        if (fbx.animations && fbx.animations.length > 0) {
          mixer = new THREE.AnimationMixer(fbx)
          const action = mixer.clipAction(fbx.animations[0])
          action.play()
          // Vary playback speed slightly per creature for natural look
          action.timeScale = 0.6 + Math.random() * 0.6
        }

        scene.add(fbx)
        seaCreatures.push({
          mesh: fbx,
          baseY: cfg.y,
          speed: cfg.speed,
          phase: i * 1.3,
          orbit: (cfg as { orbit?: number }).orbit ?? 25,
          isJellyfish: cfg.file === 'Jellyfish.fbx',
          depthFactor,
          pointLight: light,
          mixer,
          baseScale: cfg.scale,
        })
      }, undefined, (err) => {
        console.warn(`Failed to load creature ${cfg.file}:`, err)
      })
    })

    // ── Anglerfish model (by Petr Janečka, CC BY 4.0) ──
    let anglerfishModel: THREE.Group | null = null
    const gltfLoader = new GLTFLoader()
    gltfLoader.load('/assets/anglerfish/scene.gltf', (gltf) => {
      anglerfishModel = gltf.scene
      anglerfishModel.visible = false

      // Auto-scale to ~10 world units
      const box = new THREE.Box3().setFromObject(anglerfishModel)
      const size = new THREE.Vector3()
      box.getSize(size)
      const scaleFactor = 10 / Math.max(size.x, size.y, size.z)
      anglerfishModel.scale.setScalar(scaleFactor)
      anglerfishModel.userData.baseScale = scaleFactor

      // Boost emissive for deep-sea visibility
      anglerfishModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial
          if (mat.emissiveMap) {
            mat.emissiveIntensity = 3.0
          } else if (mat.emissive) {
            mat.emissive.set(0xE8913A)
            mat.emissiveIntensity = 0.5
          }
          child.castShadow = false
          child.receiveShadow = false
        }
      })

      // Lure light + visible glowing orb
      const lureLight = new THREE.PointLight(0x44ffaa, 25, 50, 1.5)
      lureLight.position.set(0, 4, 5)
      anglerfishModel.add(lureLight)
      const lureSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.9 })
      )
      lureSphere.position.copy(lureLight.position)
      lureSphere.name = 'lure-sphere'
      anglerfishModel.add(lureSphere)

      // Body + belly + rim lights
      const bodyLight = new THREE.PointLight(0xE8913A, 10, 30, 1.5)
      anglerfishModel.add(bodyLight)
      const bellyLight = new THREE.PointLight(0x4488cc, 5, 25, 1.5)
      bellyLight.position.set(0, -3, 1)
      anglerfishModel.add(bellyLight)
      const rimLight = new THREE.PointLight(0x2244aa, 4, 20, 1.5)
      rimLight.position.set(0, 1, -5)
      anglerfishModel.add(rimLight)

      scene.add(anglerfishModel)
    }, undefined, (err) => {
      console.warn('Failed to load anglerfish:', err)
    })

    // ── Lighting ──
    const ambientLight = new THREE.AmbientLight(0x8899bb, 0.5)
    scene.add(ambientLight)
    const godRayLight = new THREE.DirectionalLight(0x4488aa, 0)
    godRayLight.position.set(0, 50, 0)
    scene.add(godRayLight)

    // ── Fog ──
    scene.fog = new THREE.FogExp2(0x0a2030, 0)

    // ── Resize ──
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // ── Animation loop ──
    const clock = new THREE.Clock()
    let sceneSignaled = false
    let stableFrameCount = 0
    const FPS_THRESHOLD = 40 // frames per second considered "stable"
    const STABLE_FRAMES_NEEDED = 60 // ~1 second of stable frames

    function animate() {
      frameIdRef.current = requestAnimationFrame(animate)
      const delta = clock.getDelta()
      const elapsed = clock.elapsedTime
      const s = stateRef.current

      // Track FPS stability and signal when ready
      if (!sceneSignaled && delta > 0) {
        const fps = 1 / delta
        if (fps >= FPS_THRESHOLD) {
          stableFrameCount++
        } else {
          stableFrameCount = Math.max(0, stableFrameCount - 5)
        }
        if (stableFrameCount >= STABLE_FRAMES_NEEDED) {
          sceneSignaled = true
          onSceneReadyRef.current?.()
        }
      }

      // Tick all creature animation mixers
      seaCreatures.forEach(c => { if (c.mixer) c.mixer.update(delta) })

      water.material.uniforms['time'].value += 1.0 / 60.0

      if (s.started) {
        const targetY = Math.max(-580, 5 - s.depth * 1.5)
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.08)
        camera.position.x = Math.sin(elapsed * 0.05) * 1.5
        camera.position.z = Math.cos(elapsed * 0.03) * 1.5

        const isUnderwater = camera.position.y < 0
        const uwDepth = isUnderwater ? Math.abs(camera.position.y) : 0
        // Gradual start (power curve) but reaches near-dark at max depth (450)
        const tRaw = Math.min(1, uwDepth / 500)
        const t = Math.pow(tRaw, 0.6) // Slow start, accelerates deeper

        sky.visible = true
        water.visible = true

        // Tint plane: gradual darkening, capped so point lights remain visible at depth
        tintPlane.position.copy(camera.position)
        tintPlane.position.z -= 50
        tintPlane.lookAt(camera.position)
        if (isUnderwater) {
          tintMat.opacity = Math.min(0.55, t * 0.6)
          tintMat.color.lerpColors(
            new THREE.Color(0x0a3050),
            new THREE.Color(0x030812),
            t
          )
        } else {
          tintMat.opacity = 0
        }

        // Fog: gradual, light enough for creature/anglerfish lights to show
        const fogDensity = isUnderwater ? 0.001 + t * 0.004 : 0
        ;(scene.fog as THREE.FogExp2).density = fogDensity
        ;(scene.fog as THREE.FogExp2).color.lerpColors(
          new THREE.Color(0x0a3050),
          new THREE.Color(0x030812),
          t
        )

        // Exposure: darkens gradually but stays high enough to see lit objects
        renderer.toneMappingExposure = isUnderwater
          ? Math.max(0.12, 0.5 - t * 0.38)
          : 0.5

        // Ambient: dims but never fully dark
        ambientLight.intensity = Math.max(0.05, 0.5 - t * 0.45)
        ambientLight.color.lerpColors(new THREE.Color(0x4488aa), new THREE.Color(0x112233), t)

        // God rays: linger longer near surface
        godRayLight.intensity = isUnderwater ? Math.max(0, 2.5 - t * 3.0) : 0
        godRayLight.position.set(
          camera.position.x + Math.sin(elapsed * 0.3) * 30,
          10,
          camera.position.z + Math.cos(elapsed * 0.2) * 30
        )

        // ── Voronoi caustic planes ──
        causticPlanes.forEach((plane, i) => {
          const mat = plane.material as THREE.ShaderMaterial
          mat.uniforms.time.value = elapsed
          mat.uniforms.intensity.value = isUnderwater ? Math.max(0, 1.2 - t * 1.5) : 0
          plane.position.x = camera.position.x
          plane.position.z = camera.position.z
          plane.position.y = -2 - i * 25
          plane.visible = isUnderwater && t < 0.7
        })

        // ── Particles ──
        if (isUnderwater) {
          pMat.opacity = Math.min(0.5, 0.05 + t * 0.4)
          pMat.size = 0.3 + t * 0.4
          const posAttr = pGeo.getAttribute('position') as THREE.BufferAttribute
          for (let i = 0; i < particleCount; i++) {
            posAttr.array[i * 3 + 1] += pSpeeds[i] * 0.25
            posAttr.array[i * 3] += Math.sin(elapsed * 0.3 + i * 0.07) * 0.015
            if (posAttr.array[i * 3 + 1] > camera.position.y + 80) {
              posAttr.array[i * 3 + 1] = camera.position.y - 80
              posAttr.array[i * 3] = camera.position.x + (Math.random() - 0.5) * 300
              posAttr.array[i * 3 + 2] = camera.position.z + (Math.random() - 0.5) * 300
            }
          }
          posAttr.needsUpdate = true
        } else {
          pMat.opacity = 0
        }

        // ── Monster glow light animations ──
        const activeIdx = s.activeIdx
        monsterLights.forEach((m, i) => {
          const isActive = i === activeIdx
          m.light.intensity = isActive ? 5 + Math.sin(elapsed * 2) * 1.5 : 1.5
          m.light.distance = isActive ? 50 : 25
          m.light.position.y = m.baseY + Math.sin(elapsed * 0.6 + i * 1.7) * 0.8
        })

        // ── Sea creature swimming animations ──
        seaCreatures.forEach((c) => {
          const t = elapsed * c.speed + c.phase

          // Circular orbit: creatures swim in wide circles through the scene
          c.mesh.position.x = Math.sin(t) * c.orbit
          c.mesh.position.z = -18 + Math.cos(t) * (c.orbit * 0.6)
          c.mesh.position.y = c.baseY + Math.sin(t * 0.5) * 2

          // Face the direction of travel
          c.mesh.rotation.y = t + Math.PI * 0.5

          // Jellyfish: rhythmic scale pulsing
          if (c.isJellyfish) {
            const pulse = 1.0 + Math.sin(elapsed * 1.2 + c.phase) * 0.15
            c.mesh.scale.set(c.baseScale, c.baseScale * pulse, c.baseScale)
          }

          // Bioluminescent pulsing
          const baseLightIntensity = 2.0 + c.depthFactor * 4.0
          const pulseAmount = c.depthFactor * 2.0
          c.pointLight.intensity = baseLightIntensity + Math.sin(elapsed * 1.5 + c.phase * 2) * pulseAmount
        })

        // ── Anglerfish GLB: tied to safety score visibility ──
        if (anglerfishModel) {
          const showAngler = s.showAnglerfish

          // Smooth fade-in: track time since showAngler became true
          if (showAngler && !anglerfishModel.userData.spawnTime) {
            anglerfishModel.userData.spawnTime = elapsed
          } else if (!showAngler) {
            anglerfishModel.userData.spawnTime = 0
          }
          const timeSinceSpawn = showAngler ? elapsed - (anglerfishModel.userData.spawnTime || elapsed) : 0
          const fadeProgress = Math.min(1, timeSinceSpawn / 3) // 3 second fade-in
          anglerfishModel.visible = fadeProgress > 0
          anglerfishModel.scale.setScalar(fadeProgress * (anglerfishModel.userData.baseScale ?? 1))

          if (fadeProgress > 0) {
            // Position to the right of camera, offset so it's not behind the report
            anglerfishModel.position.x = camera.position.x + 20 + Math.sin(elapsed * 0.08) * 3
            anglerfishModel.position.z = camera.position.z - 18
            anglerfishModel.position.y = camera.position.y - 5 + Math.sin(elapsed * 0.2) * 1.5

            anglerfishModel.lookAt(camera.position)
            anglerfishModel.rotation.y += Math.sin(elapsed * 0.1) * 0.1
            anglerfishModel.rotation.z += Math.sin(elapsed * 0.12) * 0.03

            // Lure pulsing
            const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.5)
            anglerfishModel.children.forEach(child => {
              if (child instanceof THREE.PointLight && child.color.getHex() === 0x44ffaa) {
                child.intensity = (8 + pulse * 20) * fadeProgress
              }
              if (child instanceof THREE.Mesh && child.name === 'lure-sphere') {
                const mat = child.material as THREE.MeshBasicMaterial
                mat.opacity = (0.4 + pulse * 0.6) * fadeProgress
                const ls = 0.8 + pulse * 0.5
                child.scale.set(ls, ls, ls)
              }
            })
          }
        }

        // Camera pitch
        const pitch = isUnderwater
          ? -0.1 - Math.min(uwDepth * 0.002, 0.4)
          : -0.1 - Math.min(s.depth * 0.001, 0.3)
        camera.rotation.set(pitch, 0, 0)

      } else {
        // ── Idle above water ──
        tintMat.opacity = 0
        ;(scene.fog as THREE.FogExp2).density = 0
        renderer.toneMappingExposure = 0.5
        godRayLight.intensity = 0
        pMat.opacity = 0
        causticPlanes.forEach(p => p.visible = false)

        camera.position.y = 30 + Math.sin(elapsed * 0.5) * 2
        camera.position.x = Math.sin(elapsed * 0.03) * 15
        camera.position.z = 100
        camera.lookAt(0, 10, 0)
      }

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      pmremGenerator.dispose()
      if (renderTarget) renderTarget.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
}
