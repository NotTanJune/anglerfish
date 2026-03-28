import { useState, useCallback } from 'react'
import type { AppState, ScanResult, Encounter, DarkPattern } from '../types'
import { MONSTERS } from '../config/monsters'
import { scanUrl } from '../services/api'
import { FALLBACK_PATTERNS } from '../config/fallbackData'

function generateEncounters(patterns: DarkPattern[]): Encounter[] {
  const sorted = [...patterns].sort((a, b) => a.severity - b.severity)
  const regular = sorted.filter((p) => p.pattern_type !== 'bait_and_switch')
  const boss = sorted.find((p) => p.pattern_type === 'bait_and_switch')

  const maxDepth = 200 + regular.length * 100

  const encounters: Encounter[] = regular.map((pattern, i) => {
    const depth = 100 + (i * (maxDepth - 200)) / Math.max(regular.length, 1)
    return {
      id: `enc-${i}`,
      pattern,
      monster: MONSTERS[pattern.pattern_type],
      depth,
      triggered: false,
      completed: false,
    }
  })

  encounters.push({
    id: 'boss',
    pattern: boss ?? {
      pattern_type: 'bait_and_switch',
      severity: 5,
      source_text: 'The site itself is the ultimate bait.',
      page_section: 'Overall',
      confidence: 1.0,
    },
    monster: MONSTERS.bait_and_switch,
    depth: maxDepth + 100,
    triggered: false,
    completed: false,
  })

  return encounters
}

function calculateScore(patterns: DarkPattern[]): number {
  if (patterns.length === 0) return 0
  const raw = patterns.reduce((sum, p) => sum + p.severity * p.confidence, 0)
  const maxPossible = patterns.length * 5
  return Math.round((raw / maxPossible) * 100)
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score < 20) return 'A'
  if (score < 40) return 'B'
  if (score < 60) return 'C'
  if (score < 80) return 'D'
  return 'F'
}

export function useGameState() {
  const [appState, setAppState] = useState<AppState>('INPUT')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [encounters, setEncounters] = useState<Encounter[]>([])
  const [currentDepth, setCurrentDepth] = useState(0)
  const [manipulationScore, setManipulationScore] = useState(0)
  const [completedPatterns, setCompletedPatterns] = useState<DarkPattern[]>([])

  const startScan = useCallback(async (url: string) => {
    setAppState('SCANNING')
    setCurrentDepth(0)
    setManipulationScore(0)
    setCompletedPatterns([])

    let patterns: DarkPattern[]

    try {
      const scraped = await scanUrl(url)
      patterns = Array.isArray(scraped) ? scraped : FALLBACK_PATTERNS(url)
    } catch (err) {
      console.warn('API unavailable, using fallback data:', err)
      patterns = FALLBACK_PATTERNS(url)
    }

    const score = calculateScore(patterns)
    const grade = calculateGrade(score)
    const fullResult: ScanResult = {
      url,
      patterns,
      overall_score: score,
      grade,
      timestamp: new Date().toISOString(),
    }

    setScanResult(fullResult)
    setEncounters(generateEncounters(patterns))
    setAppState('DESCENT')
  }, [])

  const completeEncounter = useCallback((encounterId: string) => {
    setEncounters((prev) =>
      prev.map((e) => (e.id === encounterId ? { ...e, completed: true } : e))
    )
    setEncounters((prev) => {
      const enc = prev.find((e) => e.id === encounterId)
      if (enc) {
        setManipulationScore((s) => s + enc.pattern.severity * 10)
        setCompletedPatterns((p) => [...p, enc.pattern])
      }
      return prev
    })
  }, [])

  const finishDescent = useCallback(() => {
    setAppState('REPORT')
  }, [])

  const reset = useCallback(() => {
    setAppState('INPUT')
    setScanResult(null)
    setEncounters([])
    setCurrentDepth(0)
    setManipulationScore(0)
    setCompletedPatterns([])
  }, [])

  return {
    appState,
    scanResult,
    encounters,
    currentDepth,
    manipulationScore,
    completedPatterns,
    startScan,
    setCurrentDepth,
    completeEncounter,
    finishDescent,
    reset,
  }
}
