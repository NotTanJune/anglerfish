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

export function OceanBackground({ depth, encounters, started, activeEncounterIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef({ depth: 0, started: false, activeIdx: -1 })
  const frameIdRef = useRef(0)
  const encountersRef = useRef(encounters)

  useEffect(() => { stateRef.current.depth = depth }, [depth])
  useEffect(() => { stateRef.current.started = started }, [started])
  useEffect(() => { stateRef.current.activeIdx = activeEncounterIndex }, [activeEncounterIndex])
  useEffect(() => { encountersRef.current = encounters }, [encounters])

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
    interface SeaCreature { mesh: THREE.Group; baseY: number; speed: number; phase: number; swimRadius: number }
    const seaCreatures: SeaCreature[] = []
    const fbxLoader = new FBXLoader()

    const creatureConfig = [
      // Shallow (near surface): schools of fish, dolphin, turtle
      { file: 'ClowFish.fbx', y: -10, x: 25, z: -20, scale: 0.025, speed: 0.4, light: 0x44aaff },
      { file: 'SmallBlueFish.fbx', y: -20, x: -20, z: -25, scale: 0.025, speed: 0.5, light: 0x4488ff },
      { file: 'ClowFish.fbx', y: -30, x: 15, z: -18, scale: 0.02, speed: 0.45, light: 0xffaa44 },
      { file: 'SmallBlueFish.fbx', y: -45, x: -30, z: -22, scale: 0.02, speed: 0.55, light: 0x66ccff },
      { file: 'Dolphin.fbx', y: -35, x: 35, z: -30, scale: 0.018, speed: 0.3, light: 0x88bbdd },
      { file: 'SeaTurtle.fbx', y: -55, x: -25, z: -24, scale: 0.018, speed: 0.12, light: 0x66aa88 },
      // Mid depth: jellyfish, sharks
      { file: 'Jellyfish.fbx', y: -100, x: 12, z: -18, scale: 0.025, speed: 0.08, light: 0xaa44ff },
      { file: 'Jellyfish.fbx', y: -140, x: -18, z: -20, scale: 0.02, speed: 0.06, light: 0x44aaff },
      { file: 'Jellyfish.fbx', y: -190, x: 8, z: -16, scale: 0.018, speed: 0.07, light: 0xff44aa },
      { file: 'HammerheadShark.fbx', y: -160, x: 30, z: -30, scale: 0.015, speed: 0.2, light: 0x88aacc },
      { file: 'SmallBlueFish.fbx', y: -130, x: -25, z: -22, scale: 0.02, speed: 0.4, light: 0x4488ff },
      // Deep: octopus, whale, more jellyfish
      { file: 'PurpleOctopus.fbx', y: -250, x: -18, z: -20, scale: 0.018, speed: 0.06, light: 0x8844ff },
      { file: 'KillerWhale.fbx', y: -320, x: 25, z: -35, scale: 0.01, speed: 0.12, light: 0x6688aa },
      { file: 'Jellyfish.fbx', y: -300, x: -10, z: -18, scale: 0.02, speed: 0.05, light: 0x00ff88 },
      { file: 'PurpleOctopus.fbx', y: -380, x: 15, z: -22, scale: 0.015, speed: 0.04, light: 0xff4488 },
    ]

    creatureConfig.forEach((cfg, i) => {
      fbxLoader.load(`/assets/creatures/${cfg.file}`, (fbx) => {
        fbx.scale.setScalar(cfg.scale)
        fbx.position.set(cfg.x, cfg.y, cfg.z)

        // Ensure materials are visible with emissive properties
        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: cfg.light,
              emissive: cfg.light,
              emissiveIntensity: 0.3,
              roughness: 0.5,
              metalness: 0.1,
            })
          }
        })

        // Each creature gets its own point light so it's always visible
        const light = new THREE.PointLight(cfg.light, 1.5, 25, 2)
        fbx.add(light)

        scene.add(fbx)
        seaCreatures.push({
          mesh: fbx,
          baseY: cfg.y,
          speed: cfg.speed,
          phase: i * 1.3,
          swimRadius: 15,
        })
      }, undefined, (err) => {
        console.warn(`Failed to load creature ${cfg.file}:`, err)
      })
    })

    // ── Anglerfish GLB model at the abyss ──
    let anglerfishModel: THREE.Group | null = null
    const gltfLoader = new GLTFLoader()
    gltfLoader.load('/assets/Meshy_AI_Abyssal_Angler_0328055306_texture.glb', (gltf) => {
      anglerfishModel = gltf.scene
      anglerfishModel.scale.setScalar(8)
      anglerfishModel.position.set(5, -420, -10)

      // Make it visible in the dark with emissive materials
      anglerfishModel.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial
          if (mat.emissive) {
            mat.emissiveIntensity = 0.2
          }
        }
      })

      // Strong bioluminescent lights
      const lureLight = new THREE.PointLight(0x00ff88, 5, 60, 2)
      lureLight.position.set(0, 3, 4)
      anglerfishModel.add(lureLight)
      const bodyLight = new THREE.PointLight(0xE8913A, 2, 40, 2)
      anglerfishModel.add(bodyLight)
      const ambLight = new THREE.PointLight(0x4488aa, 3, 50, 2)
      ambLight.position.set(0, 0, -3)
      anglerfishModel.add(ambLight)

      scene.add(anglerfishModel)
    }, undefined, (err) => {
      console.warn('Failed to load anglerfish GLB:', err)
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

    function animate() {
      frameIdRef.current = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      const s = stateRef.current

      water.material.uniforms['time'].value += 1.0 / 60.0

      if (s.started) {
        const targetY = Math.max(-450, 5 - s.depth * 1.5)
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

        // Tint plane
        tintPlane.position.copy(camera.position)
        tintPlane.position.z -= 50
        tintPlane.lookAt(camera.position)
        if (isUnderwater) {
          tintMat.opacity = Math.min(0.93, t * 0.95)
          tintMat.color.lerpColors(
            new THREE.Color(0x0a3050),
            new THREE.Color(0x020510),
            t
          )
        } else {
          tintMat.opacity = 0
        }

        // Fog: gradual thickening
        const fogDensity = isUnderwater ? 0.001 + t * 0.007 : 0
        ;(scene.fog as THREE.FogExp2).density = fogDensity
        ;(scene.fog as THREE.FogExp2).color.lerpColors(
          new THREE.Color(0x0a3050),
          new THREE.Color(0x020510),
          t
        )

        // Exposure: reaches near-dark at max depth
        renderer.toneMappingExposure = isUnderwater
          ? Math.max(0.03, 0.5 - t * 0.47)
          : 0.5

        // Ambient: reaches near-dark at max depth
        ambientLight.intensity = Math.max(0.02, 0.5 - t * 0.48)
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
          c.mesh.position.x += Math.sin(t) * 0.03 * c.speed
          c.mesh.position.z += Math.cos(t * 0.7) * 0.02 * c.speed
          c.mesh.position.y = c.baseY + Math.sin(t * 0.5) * 1.5
          c.mesh.rotation.y = Math.sin(t) * 0.2
        })

        // ── Anglerfish GLB swimming animation ──
        if (anglerfishModel) {
          anglerfishModel.position.x = 5 + Math.sin(elapsed * 0.12) * 10
          anglerfishModel.position.z = -10 + Math.cos(elapsed * 0.08) * 6
          anglerfishModel.position.y = -420 + Math.sin(elapsed * 0.15) * 3
          anglerfishModel.rotation.y = Math.sin(elapsed * 0.12) * 0.3 + Math.PI * 0.8
          // Lure pulsing
          anglerfishModel.children.forEach(child => {
            if (child instanceof THREE.PointLight && child.color.getHex() === 0x00ff88) {
              child.intensity = 3 + Math.sin(elapsed * 2) * 1.5
            }
          })
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
