import { useState, type FormEvent } from 'react'

interface Props {
  onScan: (url: string) => void
}

export function URLInput({ onScan }: Props) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const cleaned = url.trim()
    if (!cleaned) return
    const withProtocol = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`
    onScan(withProtocol)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0a0a2e 0%, #061428 50%, #000 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated bubble particles via CSS */}
      <div className="bubbles-bg" />

      <h1
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 'clamp(1.5rem, 5vw, 3rem)',
          color: '#E8913A',
          textShadow: '0 0 20px rgba(232, 145, 58, 0.5), 0 0 40px rgba(232, 145, 58, 0.2)',
          marginBottom: '0.5rem',
          letterSpacing: '0.1em',
        }}
      >
        ANGLERFISH
      </h1>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 'clamp(0.4rem, 1.5vw, 0.7rem)',
          color: '#5588aa',
          marginBottom: '3rem',
          textAlign: 'center',
          lineHeight: '1.8',
        }}
      >
        How deep does the manipulation go?
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '90%', maxWidth: '500px' }}>
        <div
          style={{
            width: '100%',
            border: '2px solid #E8913A44',
            borderRadius: '4px',
            background: 'rgba(232, 145, 58, 0.05)',
            padding: '2px',
          }}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter any URL..."
            style={{
              width: '100%',
              padding: '14px 16px',
              fontFamily: 'var(--pixel-font)',
              fontSize: '0.7rem',
              background: 'transparent',
              border: 'none',
              color: '#E8913A',
              outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: '0.8rem',
            padding: '14px 40px',
            background: 'transparent',
            border: '2px solid #E8913A',
            color: '#E8913A',
            cursor: 'pointer',
            letterSpacing: '0.2em',
            transition: 'all 0.2s',
            textShadow: '0 0 10px rgba(232, 145, 58, 0.5)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#E8913A22'
            e.currentTarget.style.boxShadow = '0 0 20px rgba(232, 145, 58, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          DESCEND
        </button>
      </form>

      <p
        style={{
          position: 'absolute',
          bottom: '2rem',
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.4rem',
          color: '#334455',
          textAlign: 'center',
          lineHeight: '2',
        }}
      >
        On the internet, the pretty light is always bait.
      </p>
    </div>
  )
}
