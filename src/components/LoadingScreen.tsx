import { useState, useEffect } from 'react'

const ASSETS_TO_PRELOAD = [
  '/assets/waterNormal1.png',
  '/assets/waterNormal2.png',
  '/assets/bluenoise.png',
  '/assets/sand.png',
]

interface Props {
  onLoaded: () => void
}

export function LoadingScreen({ onLoaded }: Props) {
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let loadedCount = 0
    const total = ASSETS_TO_PRELOAD.length

    const promises = ASSETS_TO_PRELOAD.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.onload = () => {
            loadedCount++
            setProgress(Math.round((loadedCount / total) * 100))
            resolve()
          }
          img.onerror = () => {
            loadedCount++
            setProgress(Math.round((loadedCount / total) * 100))
            resolve()
          }
          img.src = src
        })
    )

    // Also preload the Google Font
    document.fonts.ready.then(() => {
      Promise.all(promises).then(() => {
        setLoaded(true)
        setTimeout(onLoaded, 600) // Brief pause for fade out
      })
    })
  }, [onLoaded])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a2e',
        transition: 'opacity 0.6s ease',
        opacity: loaded ? 0 : 1,
        pointerEvents: loaded ? 'none' : 'auto',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 'clamp(1.5rem, 5vw, 3rem)',
          color: '#E8913A',
          textShadow: '0 0 20px rgba(232, 145, 58, 0.4)',
          marginBottom: '2rem',
        }}
      >
        ANGLERFISH
      </h1>

      {/* Progress bar */}
      <div
        style={{
          width: 'clamp(200px, 40vw, 300px)',
          height: 4,
          background: '#111',
          borderRadius: 2,
          overflow: 'hidden',
          marginBottom: '1rem',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            background: '#E8913A',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.5rem',
          color: '#556',
        }}
      >
        Loading ocean... {progress}%
      </p>
    </div>
  )
}
