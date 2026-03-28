interface Props {
  score: number
}

export function ManipulationScore({ score }: Props) {
  const color = score < 100 ? '#44ff88' : score < 300 ? '#ffcc00' : '#ff4444'

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        textAlign: 'right',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.35rem',
          color: '#5588aa',
          marginBottom: '0.25rem',
        }}
      >
        THREAT LEVEL
      </p>
      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '1.2rem',
          color,
          textShadow: `0 0 15px ${color}66`,
          transition: 'color 0.3s',
        }}
      >
        {score}
      </p>
    </div>
  )
}
