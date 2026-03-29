import { ImageResponse } from '@vercel/og'

export const config = { runtime: 'edge' }

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0a1628 0%, #040e1a 40%, #020510 100%)',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#E8913A',
              textShadow: '0 0 40px rgba(232,145,58,0.5)',
              letterSpacing: '0.1em',
            }}
          >
            ANGLERFISH
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#88aabb',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: 1.6,
            }}
          >
            How deep does the manipulation go?
          </div>
          <div
            style={{
              fontSize: '18px',
              color: '#556677',
              textAlign: 'center',
              maxWidth: '700px',
              lineHeight: 1.5,
              marginTop: '8px',
            }}
          >
            Enter any URL. An AI web agent scans for dark patterns and renders them as a cinematic deep-sea descent.
          </div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            {['Urgency', 'Scarcity', 'Sneaking', 'Hidden Costs', 'Bait & Switch'].map((p) => (
              <div
                key={p}
                style={{
                  padding: '8px 16px',
                  border: '1px solid rgba(232,145,58,0.3)',
                  borderRadius: '4px',
                  color: '#E8913A',
                  fontSize: '12px',
                  background: 'rgba(232,145,58,0.08)',
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '14px',
            color: '#334455',
          }}
        >
          On the internet, the pretty light is always bait.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
