import type { ScanResult, PatternType } from '../types'
import { TAXONOMY } from '../config/taxonomy'

interface Props {
  result: ScanResult
  onReset: () => void
}

const GRADE_COLORS: Record<string, string> = {
  A: '#44ff88',
  B: '#88ff44',
  C: '#ffcc00',
  D: '#ff8800',
  F: '#ff4444',
}

export function ThreatReport({ result, onReset }: Props) {
  const gradeColor = GRADE_COLORS[result.grade] || '#ff4444'

  const patternCounts = result.patterns.reduce<Record<PatternType, number>>((acc, p) => {
    acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1
    return acc
  }, {} as Record<PatternType, number>)

  const handleShare = () => {
    const text = `ANGLERFISH Threat Assessment\n${result.url}\nGrade: ${result.grade} | Score: ${result.overall_score}/100\n${result.patterns.length} dark patterns detected\nScan yours at anglerfish.vercel.app`
    navigator.clipboard.writeText(text)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #000 0%, #0a0a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        overflow: 'auto',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.5rem',
          color: '#5588aa',
          marginBottom: '0.5rem',
        }}
      >
        THREAT ASSESSMENT
      </p>

      <h2
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: 'clamp(4rem, 15vw, 8rem)',
          color: gradeColor,
          textShadow: `0 0 40px ${gradeColor}66`,
          lineHeight: 1,
          marginBottom: '0.5rem',
        }}
      >
        {result.grade}
      </h2>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.5rem',
          color: '#aaa',
          marginBottom: '0.25rem',
        }}
      >
        {result.url}
      </p>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.6rem',
          color: gradeColor,
          marginBottom: '2rem',
        }}
      >
        MANIPULATION SCORE: {result.overall_score}/100
      </p>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.5rem',
          color: '#e0e0e0',
          marginBottom: '1.5rem',
        }}
      >
        {result.patterns.length} DARK PATTERNS DETECTED
      </p>

      {/* Pattern breakdown */}
      <div style={{ width: '100%', maxWidth: 500, marginBottom: '2rem' }}>
        {Object.entries(patternCounts).map(([type, count]) => {
          const entry = TAXONOMY[type as PatternType]
          const maxSeverity = Math.max(
            ...result.patterns
              .filter((p) => p.pattern_type === type)
              .map((p) => p.severity)
          )
          return (
            <div
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                fontFamily: 'var(--pixel-font)',
                fontSize: '0.4rem',
              }}
            >
              <span style={{ width: 24, textAlign: 'center' }}>{entry.emoji}</span>
              <span style={{ flex: 1, color: '#aaa' }}>{entry.name}</span>
              <span style={{ color: '#e0e0e0' }}>x{count}</span>
              <div style={{ width: 60, height: 6, background: '#222', borderRadius: 2 }}>
                <div
                  style={{
                    width: `${(maxSeverity / 5) * 100}%`,
                    height: '100%',
                    background: maxSeverity >= 4 ? '#ff4444' : maxSeverity >= 2 ? '#ffaa00' : '#44ff88',
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={onReset}
          style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: '0.5rem',
            padding: '10px 24px',
            background: 'transparent',
            border: '2px solid #00ff88',
            color: '#00ff88',
            cursor: 'pointer',
          }}
        >
          SCAN ANOTHER
        </button>
        <button
          onClick={handleShare}
          style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: '0.5rem',
            padding: '10px 24px',
            background: 'transparent',
            border: '2px solid #5588aa',
            color: '#5588aa',
            cursor: 'pointer',
          }}
        >
          SHARE
        </button>
      </div>
    </div>
  )
}
