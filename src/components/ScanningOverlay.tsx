import { useState, useEffect } from 'react'

const MESSAGES = [
  'Deploying web agent...',
  'Navigating to target...',
  'Analyzing page elements...',
  'Scanning for dark patterns...',
  'Identifying manipulation tactics...',
  'Classifying threats...',
]

export function ScanningOverlay() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        zIndex: 10,
      }}
    >
      {/* Sonar ping animation */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: '2rem' }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '2px solid #E8913A',
              opacity: 0,
              animation: `sonar-ping 2.5s ease-out ${i * 0.8}s infinite`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#E8913A',
            boxShadow: '0 0 20px #E8913A',
          }}
        />
      </div>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.6rem',
          color: '#E8913A',
          animation: 'blink 1s step-end infinite',
        }}
      >
        SCANNING
      </p>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.45rem',
          color: '#5588aa',
          marginTop: '1rem',
          minHeight: '1.5em',
          transition: 'opacity 0.3s',
        }}
      >
        {MESSAGES[messageIndex]}
      </p>

      <style>{`
        @keyframes sonar-ping {
          0% { transform: scale(0.3); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
