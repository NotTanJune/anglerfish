import { useState, useCallback } from 'react'
import { LoadingScreen } from './components/LoadingScreen'
import { OceanBackground } from './scene/OceanBackground'
import { DescentPage } from './components/DescentPage'
import { MONSTERS } from './config/monsters'
import { scanUrl, classifyPatterns } from './services/api'
import type { ScanResult, Encounter, DarkPattern } from './types'

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
  const [scanError, setScanError] = useState('')

  const handleLoaded = useCallback(() => setAssetsLoaded(true), [])

  const handleExplore = useCallback(async (inputUrl: string) => {
    const cleanUrl = inputUrl.trim() || 'amazon.com'
    setUrl(cleanUrl)
    setScanning(true)

    let resultPatterns: DarkPattern[]

    try {
      const scraped = await scanUrl(cleanUrl)
      const result = await classifyPatterns(cleanUrl, scraped)
      resultPatterns = result.patterns
    } catch (err) {
      console.error('Scan failed:', err)
      setScanning(false)
      setScanError(`Scan failed: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure the API server is running (vercel dev).`)
      return
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
            scanError={scanError}
            onExplore={handleExplore}
            onDepthChange={setDepth}
            onActiveEncounterChange={setActiveEncounterIndex}
          />
        </>
      )}
    </div>
  )
}
