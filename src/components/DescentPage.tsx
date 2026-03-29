import { useRef, useState, useEffect, useCallback, type FormEvent } from 'react'
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
  sceneReady?: boolean
  rateLimited?: boolean
  onScoreVisible?: () => void
  onExplore: (url: string) => void
  onDepthChange: (depth: number) => void
  onActiveEncounterChange: (index: number) => void
  onReset?: () => void
}

const METERS_PER_PIXEL = 0.08
const SECTION_HEIGHT = 1400
const INTRO_HEIGHT = 600 // Cards start sooner after going underwater

const GRADE_COLORS: Record<string, string> = {
  A: '#44ff88', B: '#88ff44', C: '#ffcc00', D: '#ff8800', F: '#ff4444',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Deploying scanner...',
  RUNNING: 'Scanning for dark patterns...',
  COMPLETED: 'Analysis complete!',
  FAILED: 'Scan failed. Try a different URL.',
  CANCELLED: 'Scan stopped',
}

export function DescentPage({
  patterns, scanResult, encounters, started, scanning, scanError,
  streamingUrl, scanStatus, sceneReady, rateLimited,
  onScoreVisible, onExplore, onDepthChange, onActiveEncounterChange, onReset,
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
  const reportHeight = 1600
  const totalHeight = cardsEnd + reportHeight
  const maxDepth = Math.round(totalHeight * METERS_PER_PIXEL)

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const sy = containerRef.current.scrollTop
    const depth = Math.round(sy * METERS_PER_PIXEL)
    setScrollY(sy)
    setScrollDepth(depth)
    onDepthChange(depth)

    // Determine which monster is active based on scroll position
    let newActive = -1
    // Only show cards within the cards section, not in boss/report
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
  }, [sorted.length, cardsStart, activeIndex, onDepthChange, onActiveEncounterChange])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Scroll to just below intro when starting
  useEffect(() => {
    if (started && containerRef.current) {
      containerRef.current.scrollTo({ top: INTRO_HEIGHT * 0.8, behavior: 'smooth' })
    }
  }, [started])

  const handleSubmit = (e: FormEvent) => {
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
      {/* Scroll spacer */}
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
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 30px rgba(232, 145, 58, 0.4)',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            ANGLERFISH
          </h1>

          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.55rem, 1.4vw, 1rem)',
            color: '#ddeeff',
            textAlign: 'center',
            marginBottom: '2.5rem',
            lineHeight: 2,
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}>
            How deep does the manipulation go?
          </p>

          {!started && !scanning && !sceneReady && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.8rem',
            }}>
              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)',
                color: '#E8913A',
                animation: 'pulse 1.5s ease-in-out infinite',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              }}>
                Preparing the ocean...
              </p>
              <div style={{
                width: 200,
                height: 4,
                background: 'rgba(232, 145, 58, 0.15)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  background: '#E8913A',
                  borderRadius: 2,
                  animation: 'shaderLoad 2s ease-in-out infinite',
                }} />
              </div>
            </div>
          )}

          {!started && !scanning && sceneReady && rateLimited && (
            <div style={{ textAlign: 'center' }}>
              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.5rem, 1.2vw, 0.7rem)',
                color: '#E8913A',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                marginBottom: '0.5rem',
              }}>
                Exploration limit reached for today.
              </p>
              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.35rem, 0.9vw, 0.5rem)',
                color: '#556',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              }}>
                Come back tomorrow for more dives.
              </p>
            </div>
          )}

          {!started && !scanning && sceneReady && !rateLimited && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.2rem',
                width: '90%',
                maxWidth: 450,
              }}
            >
              <div style={{
                width: '100%',
                border: '2px solid rgba(232, 145, 58, 0.5)',
                borderRadius: 4,
                background: '#1a1a2e',
                padding: '2px',
              }}>
                <input
                  type="text"
                  className="descent-url-input"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Enter any website url..."
                  autoFocus
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
                background: '#E8913A',
                border: '2px solid #E8913A',
                color: '#000',
                cursor: 'pointer',
                letterSpacing: '0.2em',
                transition: 'all 0.2s',
              }}>
                DIVE IN
              </button>
              {scanError && (
                <p style={{
                  fontFamily: 'var(--pixel-font)',
                  fontSize: 'clamp(0.4rem, 1vw, 0.55rem)',
                  color: '#ff4444',
                  textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                  textAlign: 'center',
                  maxWidth: 400,
                  lineHeight: 1.8,
                }}>
                  {scanError}
                </p>
              )}
            </motion.form>
          )}

          {scanning && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              width: '90%',
              maxWidth: 450,
            }}>
              {streamingUrl ? (
                <div style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  maxHeight: 280,
                  border: '2px solid rgba(232, 145, 58, 0.3)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.6)',
                }}>
                  <iframe
                    src={streamingUrl}
                    title="Live agent view"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                    }}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              ) : (
                <p style={{
                  fontFamily: 'var(--pixel-font)',
                  fontSize: 'clamp(0.7rem, 1.6vw, 1rem)',
                  color: '#E8913A',
                  animation: 'pulse 1.5s ease-in-out infinite',
                  textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                }}>
                  SCANNING...
                </p>
              )}

              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.55rem, 1.2vw, 0.75rem)',
                color: '#88aabb',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
              }}>
                {STATUS_LABELS[scanStatus || 'PENDING'] || 'Processing...'}
              </p>
              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.45rem, 0.9vw, 0.55rem)',
                color: '#aabbcc',
                textShadow: '0 0 4px #000, 0 0 4px #000',
                marginTop: '0.3rem',
              }}>
                Usually takes 30-60 seconds
              </p>
            </div>
          )}

          {started && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
            }}>
              <p style={{
                fontFamily: 'var(--pixel-font)',
                fontSize: 'clamp(0.45rem, 1vw, 0.65rem)',
                color: '#ddeeff',
                textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                textAlign: 'center',
                animation: 'pulse 2s ease-in-out infinite',
                lineHeight: 1.8,
              }}>
                Scroll down to begin your descent
              </p>
              <span style={{
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                color: '#E8913A',
                animation: 'bounce 1.5s ease-in-out infinite',
                display: 'block',
              }}>
                v
              </span>
            </div>
          )}
        </div>

        {/* === Monster scroll sections (invisible spacers) === */}
        {sorted.map((_, i) => {
          const sectionTop = cardsStart + i * SECTION_HEIGHT
          return (
            <div key={i} style={{ position: 'absolute', top: sectionTop, height: SECTION_HEIGHT, width: '100%' }}>
              {/* Zone labels that fall within this section */}
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
                        textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
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
          height={reportHeight}
          scanResult={scanResult}
          gradeColor={gradeColor}
          scrollY={scrollY}
          rateLimited={rateLimited}
          onScoreVisible={onScoreVisible}
          onReset={onReset ? () => {
            containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
            setTimeout(() => onReset(), 1500)
          } : undefined}
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
            {/* Sprite image */}
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

            {/* Info card */}
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

      {/* === Sticky Depth Meter (bigger, fills top-to-bottom) === */}
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
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
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
        .descent-url-input::placeholder {
          color: rgba(232, 145, 58, 0.4);
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }
        @keyframes shaderLoad {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// ── Boss + Report Split Section ──────────────────────────────

function BossReportSection({ top, height, scanResult, gradeColor, scrollY, rateLimited, onScoreVisible, onReset }: {
  top: number; height: number; scanResult: ScanResult; gradeColor: string; scrollY: number; rateLimited?: boolean; onScoreVisible?: () => void; onReset?: () => void
}) {
  const [copied, setCopied] = useState(false)
  const scoreNotifiedRef = useRef(false)

  const sectionScroll = Math.max(0, scrollY - top)
  const progress = Math.min(1, sectionScroll / (height * 0.4))
  const showScore = progress > 0.15

  // Fire onScoreVisible once when score first appears
  if (showScore && !scoreNotifiedRef.current && onScoreVisible) {
    scoreNotifiedRef.current = true
    onScoreVisible()
  }

  const patternCounts = Object.entries(
    scanResult.patterns.reduce<Record<string, number>>((acc, p) => {
      acc[p.pattern_type] = (acc[p.pattern_type] || 0) + 1
      return acc
    }, {})
  )

  const handleCopy = () => {
    const text = `ANGLERFISH Safety Report\n${scanResult.url}\nGrade: ${scanResult.grade} | Safety Score: ${scanResult.overall_score}/100\n${scanResult.patterns.length} dark patterns found`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div style={{ position: 'absolute', top, height, width: '100%' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={showScore ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            maxWidth: 500,
            width: '90%',
          }}
        >
          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.6rem, 1.2vw, 0.85rem)',
            color: '#88aabb',
            marginBottom: '0.8rem',
            letterSpacing: '0.3em',
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}>
            SAFETY REPORT
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
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
            marginBottom: '0.3rem',
          }}>
            SAFETY SCORE: {scanResult.overall_score}/100
          </p>

          <p style={{
            fontFamily: 'var(--pixel-font)',
            fontSize: 'clamp(0.4rem, 0.9vw, 0.55rem)',
            color: '#aaa',
            marginBottom: '1.5rem',
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
          }}>
            {scanResult.url} | {scanResult.patterns.length} dark patterns found
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

          <motion.button
            initial={{ opacity: 0 }}
            animate={showScore ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleCopy}
            style={{
              fontFamily: 'var(--pixel-font)',
              fontSize: 'clamp(0.45rem, 0.9vw, 0.6rem)',
              padding: '10px 24px',
              background: copied ? 'rgba(68, 255, 136, 0.15)' : 'rgba(232, 145, 58, 0.15)',
              border: copied ? '2px solid #44ff88' : '2px solid #E8913A',
              color: copied ? '#44ff88' : '#E8913A',
              cursor: 'pointer',
              marginTop: '1.5rem',
              borderRadius: 4,
              pointerEvents: 'auto',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
            }}
          >
            {copied ? '\u2713  COPIED!' : 'COPY REPORT'}
          </motion.button>

          {onReset && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={showScore ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 1.0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.8rem' }}
            >
              {rateLimited ? (
                <p style={{
                  fontFamily: 'var(--pixel-font)',
                  fontSize: 'clamp(0.35rem, 0.8vw, 0.5rem)',
                  color: '#E8913A',
                  textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                  textAlign: 'center',
                  lineHeight: 2,
                  pointerEvents: 'auto',
                }}>
                  Exploration limit reached today. Try again tomorrow.
                </p>
              ) : (
                <button
                  onClick={onReset}
                  style={{
                    fontFamily: 'var(--pixel-font)',
                    fontSize: 'clamp(0.45rem, 0.9vw, 0.6rem)',
                    padding: '10px 24px',
                    background: 'transparent',
                    border: '2px solid rgba(136, 170, 187, 0.4)',
                    color: '#88aabb',
                    cursor: 'pointer',
                    borderRadius: 4,
                    pointerEvents: 'auto',
                    transition: 'all 0.2s',
                  }}
                >
                  TRY ANOTHER SITE?
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
