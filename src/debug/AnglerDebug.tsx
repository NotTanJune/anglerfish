import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export default function AnglerDebug() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.2
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 20000)
    camera.position.set(0, 0, 30)
    camera.lookAt(0, 0, 0)

    // Deep ocean environment
    scene.fog = new THREE.FogExp2(0x020510, 0.003)
    scene.background = new THREE.Color(0x020510)

    const ambient = new THREE.AmbientLight(0x112233, 0.08)
    scene.add(ambient)

    // Particles
    const pCount = 200
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 100
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 100
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const pMat = new THREE.PointsMaterial({ size: 0.4, color: 0x88ccff, transparent: true, opacity: 0.3, depthWrite: false })
    scene.add(new THREE.Points(pGeo, pMat))

    // ── Load anglerfish ──
    let model: THREE.Group | null = null
    const loader = new GLTFLoader()
    loader.load('/assets/anglerfish/scene.gltf', (gltf) => {
      model = gltf.scene

      // Auto-scale: measure bounding box and scale to ~10 units
      const box = new THREE.Box3().setFromObject(model)
      const size = new THREE.Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const targetSize = 10
      const scaleFactor = targetSize / maxDim
      model.scale.setScalar(scaleFactor)

      // Auto-center
      const center = new THREE.Vector3()
      box.getCenter(center)
      model.position.sub(center.multiplyScalar(scaleFactor))

      console.log('[Angler] Model size:', size, 'scale:', scaleFactor)

      // Boost emissive on existing materials
      model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial
          console.log('[Angler] Mesh:', child.name, 'map:', !!mat.map, 'emissiveMap:', !!mat.emissiveMap)
          if (mat.emissiveMap) {
            mat.emissiveIntensity = 3.0
          } else if (mat.emissive) {
            mat.emissive.set(0xE8913A)
            mat.emissiveIntensity = 0.5
          }
        }
      })

      // Lure light (the glowing antenna bulb)
      const lureLight = new THREE.PointLight(0x44ffaa, 25, 50, 1.5)
      lureLight.position.set(0, 4, 5)
      model.add(lureLight)

      // Visible lure orb
      const lureSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x44ffaa, transparent: true, opacity: 0.9 })
      )
      lureSphere.position.copy(lureLight.position)
      lureSphere.name = 'lure-sphere'
      model.add(lureSphere)

      // Body fill (warm orange from inside)
      const bodyLight = new THREE.PointLight(0xE8913A, 10, 30, 1.5)
      model.add(bodyLight)

      // Underbelly cold fill
      const bellyLight = new THREE.PointLight(0x4488cc, 5, 25, 1.5)
      bellyLight.position.set(0, -3, 1)
      model.add(bellyLight)

      // Back rim light
      const rimLight = new THREE.PointLight(0x2244aa, 4, 20, 1.5)
      rimLight.position.set(0, 1, -5)
      model.add(rimLight)

      scene.add(model)
    }, undefined, (err) => {
      console.error('[AnglerDebug] Failed:', err)
    })

    // Mouse orbit
    let mouseX = 0, mouseY = 0
    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouseMove)

    const onWheel = (e: WheelEvent) => {
      camera.position.z = Math.max(5, Math.min(80, camera.position.z + e.deltaY * 0.05))
    }
    window.addEventListener('wheel', onWheel)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    const clock = new THREE.Clock()
    let frameId = 0

    function animate() {
      frameId = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()

      camera.position.x = mouseX * 20
      camera.position.y = -mouseY * 12
      camera.lookAt(0, 0, 0)

      if (model) {
        model.rotation.y = Math.sin(elapsed * 0.12) * 0.3 + Math.PI * 0.8
        model.position.y = Math.sin(elapsed * 0.15) * 1

        // Pulse the lure
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.5)
        model.children.forEach(child => {
          if (child instanceof THREE.PointLight && child.color.getHex() === 0x44ffaa) {
            child.intensity = 10 + pulse * 25
          }
          if (child instanceof THREE.Mesh && child.name === 'lure-sphere') {
            const mat = child.material as THREE.MeshBasicMaterial
            mat.opacity = 0.4 + pulse * 0.6
            const s = 0.8 + pulse * 0.5
            child.scale.set(s, s, s)
          }
        })
      }

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <div style={{
        position: 'fixed', top: 12, left: 12, zIndex: 10,
        fontFamily: 'monospace', fontSize: 12, color: '#0f0', opacity: 0.7,
      }}>
        ANGLER DEBUG | Mouse to orbit | Scroll to zoom
      </div>
    </div>
  )
}
