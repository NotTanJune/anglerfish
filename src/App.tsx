import { useState, useCallback, useRef } from 'react'
import { LoadingScreen } from './components/LoadingScreen'
import { OceanBackground } from './scene/OceanBackground'
import { DescentPage } from './components/DescentPage'
import { AudioManager } from './audio/AudioManager'
import { MONSTERS } from './config/monsters'
import { FALLBACK_PATTERNS } from './config/fallbackData'
import { startScan, pollScan, RateLimitError, type PollResult } from './services/api'
import type { ScanResult, Encounter, DarkPattern, PatternType } from './types'

const VALID_TYPES: PatternType[] = [
  'urgency', 'scarcity', 'misdirection', 'forced_action', 'social_proof',
  'sneaking', 'obstruction', 'confirmshaming', 'disguised_ads', 'nagging',
  'trick_questions', 'hidden_costs', 'bait_and_switch',
]

// Map TinyFish raw response to our DarkPattern format
function mapTinyFishResponse(data: unknown): DarkPattern[] | null {
  if (!data || typeof data !== 'object') return null

  // Handle { dark_patterns: [...] } format
  const obj = data as Record<string, unknown>
  const items = Array.isArray(obj.dark_patterns) ? obj.dark_patterns
    : Array.isArray(obj.patterns) ? obj.patterns
    : Array.isArray(data) ? data as unknown[]
    : null

  if (!items || items.length === 0) return null

  return items.map((item: unknown, i: number) => {
    const p = item as Record<string, unknown>
    const rawType = String(p.type || p.pattern_type || 'misdirection').toLowerCase().replace(/\s+/g, '_')
    const patternType = VALID_TYPES.includes(rawType as PatternType) ? rawType as PatternType : 'misdirection'

    return {
      pattern_type: patternType,
      severity: (typeof p.severity === 'number' ? p.severity : Math.min(5, Math.max(1, i + 1))) as 1|2|3|4|5,
      source_text: String(p.text || p.source_text || ''),
      page_section: String(p.section || p.page_section || 'Unknown'),
      confidence: typeof p.confidence === 'number' ? p.confidence : 0.85,
    }
  }).filter(p => p.source_text.length > 0)
}

const METERS_PER_PIXEL = 0.08
const CARD_SCROLL_HEIGHT = 1400
const INTRO_HEIGHT = 600

function calculateScore(patterns: DarkPattern[]): number {
  if (patterns.length === 0) return 100 // no patterns = perfect safety

  // Intensity: average severity weighted by confidence (0-100)
  const raw = patterns.reduce((sum, p) => sum + p.severity * p.confidence, 0)
  const intensity = (raw / (patterns.length * 5)) * 100

  // Breadth: how many distinct pattern types found, scaled 0-100
  const breadth = Math.min(100, (patterns.length / 10) * 100)

  // Manipulation level (0-100), then invert to safety score (100 = safe, 0 = worst)
  const manipulation = intensity * 0.6 + breadth * 0.4
  return Math.round(100 - manipulation)
}

function deduplicatePatterns(patterns: DarkPattern[]): DarkPattern[] {
  const byType = new Map<string, DarkPattern>()
  patterns.forEach(p => {
    const existing = byType.get(p.pattern_type)
    if (!existing || p.severity > existing.severity) byType.set(p.pattern_type, p)
  })
  return [...byType.values()].sort((a, b) => a.severity - b.severity)
}

function buildEncounters(patterns: DarkPattern[]): Encounter[] {
  const deduped = deduplicatePatterns(patterns)
  return deduped.map((pattern, i) => ({
    id: `enc-${i}`,
    pattern,
    monster: MONSTERS[pattern.pattern_type],
    depth: Math.round((INTRO_HEIGHT + i * CARD_SCROLL_HEIGHT) * METERS_PER_PIXEL),
    triggered: false,
    completed: false,
  }))
}

export default function App() {
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const [depth, setDepth] = useState(0)
  const [started, setStarted] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [activeEncounterIndex, setActiveEncounterIndex] = useState(-1)
  const [url, setUrl] = useState('')
  const [patterns, setPatterns] = useState<DarkPattern[]>([])
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [streamingUrl, setStreamingUrl] = useState<string | null>(null)
  const [scanStatus, setScanStatus] = useState<string>('PENDING')
  const [sceneReady, setSceneReady] = useState(false)
  const [rateLimited, setRateLimited] = useState(false)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLoaded = useCallback(() => setAssetsLoaded(true), [])
  const handleSceneReady = useCallback(() => setSceneReady(true), [])

  const finalizeScan = useCallback((resultPatterns: DarkPattern[], cleanUrl: string) => {
    const deduped = deduplicatePatterns(resultPatterns)
    const score = calculateScore(deduped)
    const grade = score >= 80 ? 'A' as const : score >= 60 ? 'B' as const : score >= 40 ? 'C' as const : score >= 20 ? 'D' as const : 'F' as const

    const sr: ScanResult = {
      url: cleanUrl,
      patterns: deduped,
      overall_score: score,
      grade,
      timestamp: new Date().toISOString(),
    }

    setPatterns(deduped)
    setEncounters(buildEncounters(deduped))
    setScanResult(sr)
    setScanning(false)
    setStreamingUrl(null)
    setScanStatus('COMPLETED')
    setStarted(true)
  }, [])

  const handleExplore = useCallback(async (inputUrl: string) => {
    let cleanUrl = inputUrl.trim() || 'amazon.com'
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    setUrl(cleanUrl)
    setScanning(true)
    setScanStatus('PENDING')
    setStreamingUrl(null)

    try {
      const runId = await startScan(cleanUrl)
      console.log('[scan] run started:', runId)

      // Poll loop
      const poll = async () => {
        try {
          const pollResult: PollResult = await pollScan(runId)
          console.log('[poll]', pollResult.status, pollResult.streamingUrl ? '(has stream)' : '')

          setScanStatus(pollResult.status)
          if (pollResult.streamingUrl) {
            setStreamingUrl(pollResult.streamingUrl)
          }

          if (pollResult.status === 'COMPLETED') {
            const mapped = mapTinyFishResponse(pollResult.result)
            if (mapped && mapped.length > 0) {
              finalizeScan(mapped, cleanUrl)
            } else {
              console.warn('TinyFish returned no patterns, using fallback')
              finalizeScan(FALLBACK_PATTERNS(cleanUrl), cleanUrl)
            }
          } else if (pollResult.status === 'FAILED' || pollResult.status === 'CANCELLED') {
            console.warn('Scan failed/cancelled, using fallback')
            finalizeScan(FALLBACK_PATTERNS(cleanUrl), cleanUrl)
          } else {
            // Still running, poll again in 3s
            pollRef.current = setTimeout(poll, 3000)
          }
        } catch (err) {
          console.warn('Poll error, using fallback:', err)
          finalizeScan(FALLBACK_PATTERNS(cleanUrl), cleanUrl)
        }
      }

      // Start first poll after 2s (give time for PENDING -> RUNNING)
      pollRef.current = setTimeout(poll, 2000)

    } catch (err) {
      if (err instanceof RateLimitError) {
        setRateLimited(true)
        setScanning(false)
        return
      }
      console.warn('API unavailable, using fallback data:', err)
      finalizeScan(FALLBACK_PATTERNS(cleanUrl), cleanUrl)
    }
  }, [finalizeScan])

  const handleReset = useCallback(() => {
    // Clear any ongoing poll
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
    setStarted(false)
    setScanning(false)
    setDepth(0)
    setActiveEncounterIndex(-1)
    setUrl('')
    setPatterns([])
    setEncounters([])
    setScanResult(null)
    setStreamingUrl(null)
    setScanStatus('PENDING')
  }, [])

  // Debug: jump straight to deep depth with fake data
  const handleDebugDeep = useCallback(() => {
    const fakePatterns: DarkPattern[] = [
      { pattern_type: 'urgency', severity: 4, source_text: 'Debug pattern', page_section: 'Test', confidence: 0.9 },
      { pattern_type: 'scarcity', severity: 3, source_text: 'Debug pattern', page_section: 'Test', confidence: 0.85 },
      { pattern_type: 'bait_and_switch', severity: 5, source_text: 'Debug pattern', page_section: 'Test', confidence: 0.95 },
    ]
    const deduped = deduplicatePatterns(fakePatterns)
    const score = calculateScore(deduped)
    const grade = score >= 80 ? 'A' as const : score >= 60 ? 'B' as const : score >= 40 ? 'C' as const : score >= 20 ? 'D' as const : 'F' as const
    setUrl('debug://deep-test')
    setPatterns(deduped)
    setEncounters(buildEncounters(deduped))
    setScanResult({ url: 'debug://deep-test', patterns: deduped, overall_score: score, grade, timestamp: new Date().toISOString() })
    setStarted(true)
    setDepth(9999)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#000' }}>
      <LoadingScreen onLoaded={handleLoaded} />

      {assetsLoaded && (
        <>
          <OceanBackground
            depth={depth}
            encounters={encounters}
            started={started}
            activeEncounterIndex={activeEncounterIndex}
            onSceneReady={handleSceneReady}
          />
          <AudioManager depth={depth} isActive={scanning || started} />
          <DescentPage
            patterns={patterns}
            url={url}
            scanResult={scanResult ?? { url: '', patterns: [], overall_score: 0, grade: 'A', timestamp: '' }}
            encounters={encounters}
            started={started}
            sceneReady={sceneReady}
            scanning={scanning}
            scanError=""
            streamingUrl={streamingUrl}
            scanStatus={scanStatus}
            rateLimited={rateLimited}
            onExplore={handleExplore}
            onDepthChange={setDepth}
            onActiveEncounterChange={setActiveEncounterIndex}
            onReset={handleReset}
          />
          {import.meta.env.DEV && (
            <button
              onClick={handleDebugDeep}
              style={{
                position: 'fixed',
                bottom: 12,
                right: 12,
                zIndex: 9999,
                fontFamily: 'monospace',
                fontSize: '11px',
                padding: '6px 12px',
                background: '#222',
                color: '#0f0',
                border: '1px solid #333',
                borderRadius: 4,
                cursor: 'pointer',
                opacity: 0.6,
              }}
            >
              DEBUG: Jump to deep
            </button>
          )}
        </>
      )}
    </div>
  )
}
