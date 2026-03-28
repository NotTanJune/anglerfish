import { useState, useCallback } from 'react'
import { LoadingScreen } from './components/LoadingScreen'
import { OceanBackground } from './scene/OceanBackground'
import { DescentPage } from './components/DescentPage'
import { MONSTERS } from './config/monsters'
import { FALLBACK_PATTERNS } from './config/fallbackData'
import { scanUrl } from './services/api'
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
const INTRO_HEIGHT = 600 // Reduced: cards start sooner after going underwater

function calculateScore(patterns: DarkPattern[]): number {
  if (patterns.length === 0) return 0
  const raw = patterns.reduce((sum, p) => sum + p.severity * p.confidence, 0)
  return Math.round((raw / (patterns.length * 5)) * 100)
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

  const handleLoaded = useCallback(() => setAssetsLoaded(true), [])

  const handleExplore = useCallback(async (inputUrl: string) => {
    let cleanUrl = inputUrl.trim() || 'amazon.com'
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl
    }
    setUrl(cleanUrl)
    setScanning(true)

    let resultPatterns: DarkPattern[]

    try {
      const rawData = await scanUrl(cleanUrl)
      const mapped = mapTinyFishResponse(rawData)
      if (mapped && mapped.length > 0) {
        resultPatterns = mapped
      } else {
        console.warn('TinyFish returned no patterns, using fallback')
        resultPatterns = FALLBACK_PATTERNS(cleanUrl)
      }
    } catch (err) {
      console.warn('API unavailable, using fallback data:', err)
      resultPatterns = FALLBACK_PATTERNS(cleanUrl)
    }

    const deduped = deduplicatePatterns(resultPatterns)
    const score = calculateScore(deduped)
    const grade = score < 20 ? 'A' as const : score < 40 ? 'B' as const : score < 60 ? 'C' as const : score < 80 ? 'D' as const : 'F' as const

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
    setStarted(true)
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
          />
          <DescentPage
            patterns={patterns}
            url={url}
            scanResult={scanResult ?? { url: '', patterns: [], overall_score: 0, grade: 'A', timestamp: '' }}
            encounters={encounters}
            started={started}
            scanning={scanning}
            scanError=""
            onExplore={handleExplore}
            onDepthChange={setDepth}
            onActiveEncounterChange={setActiveEncounterIndex}
          />
        </>
      )}
    </div>
  )
}
