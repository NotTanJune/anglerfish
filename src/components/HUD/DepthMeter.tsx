import { getZoneAtDepth } from '../../config/depthZones'

interface Props {
  depth: number
}

export function DepthMeter({ depth }: Props) {
  const zone = getZoneAtDepth(depth)

  return (
    <div
      style={{
        position: 'absolute',
        left: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        zIndex: 5,
        pointerEvents: 'none',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.35rem',
          color: '#5588aa',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
          letterSpacing: '0.15em',
        }}
      >
        {zone.name}
      </p>

      {/* Depth bar */}
      <div
        style={{
          width: 6,
          height: 200,
          background: '#111',
          borderRadius: 3,
          position: 'relative',
          border: '1px solid #333',
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${Math.min(100, (depth / 1200) * 100)}%`,
            background: 'linear-gradient(to top, #ff4444, #ffaa00, #E8913A)',
            borderRadius: 3,
            transition: 'height 0.3s',
          }}
        />
      </div>

      <p
        style={{
          fontFamily: 'var(--pixel-font)',
          fontSize: '0.4rem',
          color: '#E8913A',
        }}
      >
        {Math.round(depth)}m
      </p>
    </div>
  )
}
