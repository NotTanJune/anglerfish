import type { DarkPattern } from '../../types'
import { TAXONOMY } from '../../config/taxonomy'

interface Props {
  patterns: DarkPattern[]
}

export function PatternTicker({ patterns }: Props) {
  if (patterns.length === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 5,
        pointerEvents: 'none',
        maxWidth: '90vw',
        overflow: 'hidden',
      }}
    >
      {patterns.slice(-6).map((p, i) => {
        const entry = TAXONOMY[p.pattern_type]
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '4px 8px',
              background: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid #333',
              borderRadius: 2,
              fontFamily: 'var(--pixel-font)',
              fontSize: '0.3rem',
              color: '#aaa',
              whiteSpace: 'nowrap',
              animation: 'fadeIn 0.3s ease-in',
            }}
          >
            <span>{entry.emoji}</span>
            <span>{entry.name}</span>
          </div>
        )
      })}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
