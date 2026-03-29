import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DarkPattern, ScanResult, Encounter } from '../types'
import { TAXONOMY } from '../config/taxonomy'
import { MONSTERS } from '../config/monsters'
import { SPRITE_MAP } from '../config/spriteMap'
import { DEPTH_ZONES } from '../config/depthZones'

interface Props {
  patterns: DarkPattern[]
  url: string
  scanResult: ScanResult
  encounters: Encounter[]
  started: boolean
  scanning?: boolean
  scanError?: string
  streamingUrl?: string | null
  scanStatus?: string
  onExplore: (url: string) => void
  onDepthChange: (depth: number) => void
  onActiveEncounterChange: (index: number) => void
  onReset?: () => void
}

const METERS_PER_PIXEL = 0.08
const SECTION_HEIGHT = 1400
const INTRO_HEIGHT = 600

const GRADE_COLORS: Record<string, string> = {
  A: '#44ff88', B: '#88ff44', C: '#ffcc00', D: '#ff8800', F: '#ff4444',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Starting web agent...',
  RUNNING: 'Agent navigating site...',
  COMPLETED: 'Analysis complete',
  FAILED: 'Scan failed',
  CANCELLED: 'Scan cancelled',
}

export function DescentPage({
  patterns, scanResult, encounters, started, scanning, scanError,
  streamingUrl, scanStatus,
  onExplore, onDepthChange, onActiveEncounterChange, onReset,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollDepth, setScrollDepth] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [inputUrl, setInputUrl] = useState('')

  // Deduplicate: keep highest severity per pattern type, then sort ascending (worst = deepest)
  const byType = new Map<string, DarkPattern>()
  patterns.forEach(p => {
    const existing = byType.get(p.pattern_type)
    if (!existing || p.severity > existing.severity) byType.set(p.pattern_type, p)
  })
  const sorted = [...byType.values()].sort((a, b) => a.severity - b.severity)

  const cardsStart = INTRO_HEIGHT
  const cardsEnd = cardsStart + sorted.length * SECTION_HEIGHT
  const bossHeight = 1400
  const reportHeight = 2400
  const totalHeight = cardsEnd + bossHeight + reportHeight

  const currentZone = DEPTH_ZONES.find(
    (z) => scrollDepth >= z.startDepth && scrollDepth < z.endDepth
  ) ?? DEPTH_ZONES[DEPTH_ZONES.length - 1]

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const sy = containerRef.current.scrollTop
    const depth = Math.round(sy * METERS_PER_PIXEL)
    setScrollY(sy)
    setScrollDepth(depth)
    onDepthChange(depth)

    let newActive = -1
    if (sy < cardsEnd) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        const sectionTop = cardsStart + i * SECTION_HEIGHT
        const sectionMid = sectionTop + SECTION_HEIGHT * 0.3
        const sectionEnd = sectionTop + SECTION_HEIGHT
        if (sy >= sectionMid && sy < sectionEnd) {
          newActive = i
          break
        }
      }
    }
    if (newActive !== activeIndex) {
      setActiveIndex(newActive)
      onActiveEncounterChange(newActive)
    }
  }, [sorted.length, cardsStart, activeIndex, onDepthChange, onActiveEncounterChange, cardsEnd])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    if (started && containerRef.current) {
      containerRef.current.scrollTo({ top: INTRO_HEIGHT * 0.8, behavior: 'smooth' })
    }
  }, [started])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onExplore(inputUrl.trim() || 'amazon.com')
  }

  const activePattern = activeIndex >= 0 ? sorted[activeIndex] : null
  const activeTaxonomy = activePattern ? TAXONOMY[activePattern.pattern_type] : null
  const activeMonster = activePattern ? MONSTERS[activePattern.pattern_type] : null
  const activeDepth = activeIndex >= 0 ? encounters[activeIndex]?.depth ?? 0 : 0

  const gradeColor = GRADE_COLORS[scanResult.grade] || '#ff4444'

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: started ? 'scroll' : 'hidden',
        overflowX: 'hidden',
        zIndex: 2,
      }}
    >
      {/* Scroll spacer - only expand to full height after scan starts */}
      <div style={{ position: 'relative', width: '100%', height: started ? totalHeight : INTRO_HEIGHT }}>

        {/* === Intro / URL Input (above water) === */}
        <div style={{
          height: INTRO_HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <h1 style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(2rem, 6vw, 4rem)',
            color: '#E8913A',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 30px rgba(232, 145, 58, 0.4)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            ANGLERFISH
          </h1>

          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.55rem, 1.4vw, 0.8rem)',
            color: '#ddeeff',
            textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)',
            textAlign: 'center',
            marginBottom: '2.5rem',
            lineHeight: 2,
          }}>
            How deep does the manipulation go?
          </p>

          {!started && !scanning && (
            <form onSubmit={handleSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.2rem',
              width: '90%',
              maxWidth: 450,
            }}>
              <div style={{
                width: '100%',
                border: '2px solid rgba(232, 145, 58, 0.5)',
                borderRadius: 4,
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(8px)',
                padding: '2px',
              }}>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Enter any URL..."
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontFamily: 'var(--pixel-font)',
                    fontSize: '0.7rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    outline: 'none',
                  }}
                />
              </div>
              <button type="submit" style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: '0.8rem',
                padding: '14px 40px',
                background: 'rgba(232, 145, 58, 0.15)',
                border: '2px solid #E8913A',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
                color: '#E8913A',
                cursor: 'pointer',
                letterSpacing: '0.2em',
                transition: 'all 0.2s',
              }}>
                EXPLORE
              </button>
              {scanError && (
                <p style={{
                  fontFamily: 'var(--pixel-font)',
                  fontSize: 'clamp(0.4rem, 1vw, 0.55rem)',
                  color: '#ff4444',
                  textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                  textAlign: 'center',
                  maxWidth: 400,
                  lineHeight: 1.8,
                }}>
                  {scanError}
                </p>
              )}
            </form>
          )}

          {scanning && (
            <div style={{ textAlign: 'center', width: '90%', maxWidth: 520 }}>
              {streamingUrl ? (
                <div style={{
                  border: '1px solid rgba(232, 145, 58, 0.3)',
                  borderRadius: 6,
                  overflow: 'hidden',
                  marginBottom: '1rem',
                  background: '#000',
                }}>
                  <iframe
                    src={streamingUrl}
                    style={{ width: '100%', height: 280, border: 'none', display: 'block' }}
                    title="Live agent session"
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              ) : (
                <div style={{
                  width: '100%',
                  height: 280,
                  marginBottom: '1rem',
                  border: '1px solid rgba(232, 145, 58, 0.2)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                }}>
                  <p style={{
                    fontFamily: 'var(--pixel-font)',
                    fontSize: 'clamp(0.4rem, 1vw, 0.55rem)',
                    color: '#445',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}>
                    Waiting for agent...
                  </p>
                </div>
              )}
              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.6rem, 1.4vw, 0.75rem)',
                color: '#E8913A',
                animation: 'pulse 1.5s ease-in-out infinite',
                textShadow: '0 1px 6px rgba(0,0,0,0.9)',
              }}>
                SCANNING...
              </p>
              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.35rem, 0.9vw, 0.5rem)',
                color: '#556',
                marginTop: '0.4rem',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>
                {STATUS_LABELS[scanStatus ?? ''] ?? 'Deploying web agent...'}
              </p>
            </div>
          )}

          {started && (
            <p style={{
              fontFamily: 'var(--pixel-font)',
              fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)',
              color: '#ddeeff',
              textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)',
              marginTop: '1rem',
              animation: 'pulse 2s ease-in-out infinite',
              textAlign: 'center',
            }}>
              SCROLL TO DESCEND
            </p>
          )}
        </div>

        {/* === Monster scroll sections (invisible spacers) === */}
        {sorted.map((_, i) => {
          const sectionTop = cardsStart + i * SECTION_HEIGHT
          return (
            <div key={i} style={{ position: 'absolute', top: sectionTop, height: SECTION_HEIGHT, width: '100%' }}>
              {DEPTH_ZONES.slice(1).map((zone) => {
                const zonePixel = zone.startDepth / METERS_PER_PIXEL
                if (zonePixel >= sectionTop && zonePixel < sectionTop + SECTION_HEIGHT) {
                  return (
                    <div key={zone.name} style={{
                      position: 'absolute',
                      top: zonePixel - sectionTop,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}>
                      <div style={{ width: '70vw', maxWidth: 600, height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 auto 1rem' }} />
                      <p style={{
                        fontFamily: 'var(--pixel-font)',
                        fontSize: 'clamp(1.2rem, 3vw, 2rem)',
                        color: 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.4em',
                        textShadow: '0 0 30px rgba(255,255,255,0.15), 0 2px 10px rgba(0,0,0,0.9)',
                      }}>
                        {zone.name}
                      </p>
                    </div>
                  )
                }
                return null
              })}
            </div>
          )
        })}

        {/* === Boss + Report Split Section === */}
        <BossReportSection
          top={cardsEnd}
          height={bossHeight + reportHeight}
          scanResult={scanResult}
          gradeColor={gradeColor}
          scrollY={scrollY}
          onReset={onReset}
        />
      </div>

      {/* === Monster Sprite + Info Card (framer-motion) === */}
      <AnimatePresence>
        {activePattern && activeTaxonomy && activeMonster && (
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: '55%', x: '-50%' }}
            animate={{ opacity: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, y: '-55%', x: '-50%' }}
            transition={{ type: 'spring' as const, stiffness: 180, damping: 22 }}
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.8rem',
              zIndex: 20,
              pointerEvents: 'none',
              width: 'clamp(350px, 55vw, 650px)',
              maxHeight: '85vh',
              overflow: 'hidden',
            }}
          >
            {SPRITE_MAP[activePattern.pattern_type] && (
              <motion.img
                src={SPRITE_MAP[activePattern.pattern_type]}
                alt={activeMonster.monster_name}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.3, opacity: 0 }}
                transition={{ type: 'spring' as const, stiffness: 250, damping: 18, delay: 0.1 }}
                style={{
                  width: 'clamp(100px, 15vw, 180px)',
                  height: 'clamp(100px, 15vw, 180px)',
                  imageRendering: 'pixelated',
                }}
              />
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              style={{
                background: 'rgba(0, 0, 0, 0.7)',
                border: `1px solid ${activeMonster.color}44`,
                borderBottom: `3px solid ${activeMonster.color}`,
                borderRadius: 8,
                padding: 'clamp(14px, 2.5vw, 22px)',
                backdropFilter: 'blur(16px)',
                width: '100%',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <span style={{
                  fontFamily: 'var(--pixel-font)',
                  fontSize: 'clamp(0.6rem, 1.4vw, 0.9rem)',
                  color: activeMonster.color,
                }}>
                  {activeMonster.monster_name.toUpperCase()}
                </span>
                <span style={{
                  fontFamily: 'var(--pixel-font)',
                  fontSize: 'clamp(0.5rem, 1vw, 0.65rem)',
                  color: '#ffcc00',
                }}>
                  {'*'.repeat(activePattern.severity)}
                </span>
              </div>

              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.4rem, 0.9vw, 0.55rem)',
                color: '#88aabb',
                marginBottom: '0.5rem',
              }}>
                {activeTaxonomy.name}
              </p>

              <p style={{
                fontFamily: "'Georgia', serif",
                fontSize: 'clamp(0.75rem, 1.4vw, 0.95rem)',
                color: '#8899aa',
                lineHeight: 1.6,
                marginBottom: '0.8rem',
              }}>
                {activeTaxonomy.description}
              </p>

              <p style={{
                fontFamily: "'Georgia', serif",
                fontSize: 'clamp(1rem, 2vw, 1.3rem)',
                color: '#eee',
                lineHeight: 1.8,
                fontStyle: 'italic',
                marginBottom: '0.5rem',
                padding: '0.6rem 1rem',
                background: 'rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${activeMonster.color}`,
                borderRadius: 4,
              }}>
                "{activePattern.source_text}"
              </p>

              <p style={{
                fontFamily: "'Georgia', serif",
                fontSize: 'clamp(0.7rem, 1.2vw, 0.85rem)',
                color: '#667788',
                lineHeight: 1.6,
                marginBottom: '0.5rem',
              }}>
                Example: {activeTaxonomy.example}
              </p>

              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.3rem, 0.7vw, 0.4rem)',
                color: '#556',
              }}>
                {activePattern.page_section} | {activeDepth}m
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Sticky Depth Meter === */}
      {started && (
        <div style={{
          position: 'fixed',
          left: 28,
          top: '10%',
          bottom: '10%',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'none',
        }}>
          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.45rem, 1vw, 0.6rem)',
            color: '#889',
            textAlign: 'center',
            maxWidth: 100,
            textShadow: '0 1px 6px rgba(0,0,0,0.9)',
            letterSpacing: '0.1em',
          }}>
            {currentZone.name}
          </p>
          <div style={{
            width: 6,
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 3,
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              width: '100%',
              height: `${Math.min(100, (scrollY / cardsEnd) * 100)}%`,
              background: 'linear-gradient(to bottom, #E8913A, #ff8800, #ff4444)',
              borderRadius: 3,
              transition: 'height 0.15s',
              boxShadow: '0 0 8px rgba(232, 145, 58, 0.4)',
            }} />
          </div>
          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.8rem, 1.8vw, 1.2rem)',
            color: '#E8913A',
            textShadow: '0 0 15px rgba(232, 145, 58, 0.6), 0 2px 6px rgba(0,0,0,0.9)',
          }}>
            {scrollDepth}m
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Boss + Report Split Section ──────────────────────────────

function BossReportSection({ top, height, scanResult, gradeColor, scrollY, onReset }: {
  top: number; height: number; scanResult: ScanResult; gradeColor: string; scrollY: number; onReset?: () => void
}) {
  const sectionScroll = Math.max(0, scrollY - top)
  const progress = Math.min(1, sectionScroll / (height * 0.4))
  const showScore = progress > 0.3

  const patternCounts = Object.entries(
    scanResult.patterns.reduce<Record<string, number>>((acc, p) => {
      acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1
      return acc
    }, {})
  )

  return (
    <div style={{ position: 'absolute', top, height, width: '100%' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        {/* Left half: Boss message */}
        <motion.div
          animate={{ x: showScore ? 0 : '25%' }}
          transition={{ duration: 0.8 }}
          style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            color: '#E8913A',
            textShadow: '0 0 40px rgba(232, 145, 58, 0.5), 0 2px 8px rgba(0,0,0,0.8)',
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            THE ANGLERFISH
          </p>
          <p style={{
            fontFamily: "'Georgia', serif",
            fontSize: 'clamp(0.9rem, 2vw, 1.2rem)',
            color: '#88aabb',
            fontStyle: 'italic',
            maxWidth: 400,
            textAlign: 'center',
            lineHeight: 1.8,
            textShadow: '0 1px 6px rgba(0,0,0,0.8)',
          }}>
            On the internet, the pretty light is always bait.
          </p>
        </motion.div>

        {/* Right half: Score (slides in) */}
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={showScore ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
          transition={{ duration: 0.6 }}
          style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.6rem, 1.2vw, 0.85rem)',
            color: '#88aabb',
            marginBottom: '0.8rem',
            letterSpacing: '0.3em',
            textShadow: '0 1px 6px rgba(0,0,0,0.8)',
          }}>
            THREAT ASSESSMENT
          </p>

          <motion.h2
            initial={{ scale: 0.5, opacity: 0 }}
            animate={showScore ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring' as const, stiffness: 120, damping: 12, delay: 0.2 }}
            style={{
              fontFamily: 'var(--pixel-font)',
              fontSize: 'clamp(5rem, 14vw, 10rem)',
              color: gradeColor,
              textShadow: `0 0 60px ${gradeColor}88, 0 0 120px ${gradeColor}44`,
              lineHeight: 1,
              marginBottom: '0.5rem',
            }}
          >
            {scanResult.grade}
          </motion.h2>

          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.7rem, 1.5vw, 1rem)',
            color: gradeColor,
            textShadow: '0 1px 6px rgba(0,0,0,0.8)',
            marginBottom: '0.3rem',
          }}>
            SCORE: {scanResult.overall_score}/100
          </p>

          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.4rem, 0.9vw, 0.55rem)',
            color: '#aaa',
            marginBottom: '1.5rem',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}>
            {scanResult.url} | {scanResult.patterns.length} patterns
          </p>

          <div style={{ width: '100%', maxWidth: 350 }}>
            {patternCounts.map(([type, count], i) => {
              const tx = TAXONOMY[type as keyof typeof TAXONOMY]
              const m = MONSTERS[type as keyof typeof MONSTERS]
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, x: 30 }}
                  animate={showScore ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
                  transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    marginBottom: '0.6rem',
                    fontFamily: 'var(--pixel-font)',
                    fontSize: 'clamp(0.4rem, 0.9vw, 0.55rem)',
                    padding: '5px 10px',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: 4,
                    borderLeft: `3px solid ${m.color}`,
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{tx.emoji}</span>
                  <span style={{ flex: 1, color: '#ccc' }}>{tx.name}</span>
                  <span style={{ color: m.color }}>x{count}</span>
                </motion.div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={showScore ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.8 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.7rem', marginTop: '1.5rem', pointerEvents: 'auto' }}
          >
            <button
              onClick={() => {
                const text = `ANGLERFISH Threat Assessment\n${scanResult.url}\nGrade: ${scanResult.grade} | Score: ${scanResult.overall_score}/100\n${scanResult.patterns.length} dark patterns detected`
                navigator.clipboard.writeText(text)
              }}
              style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.45rem, 0.9vw, 0.6rem)',
                padding: '10px 24px',
                background: 'rgba(232, 145, 58, 0.15)',
                border: '2px solid #E8913A',
                color: '#E8913A',
                cursor: 'pointer',
                borderRadius: 4,
              }}
            >
              COPY RESULTS
            </button>
            {onReset && (
              <button
                onClick={onReset}
                style={{
                  fontFamily: 'var(--pixel-font)',
                  fontSize: 'clamp(0.4rem, 0.85vw, 0.55rem)',
                  padding: '8px 20px',
                  background: 'transparent',
                  border: '1px solid rgba(136, 170, 187, 0.3)',
                  color: '#88aabb',
                  cursor: 'pointer',
                  borderRadius: 4,
                }}
              >
                TRY ANOTHER SITE?
              </button>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
