export type AppState = 'INPUT' | 'SCANNING' | 'DESCENT' | 'REPORT'

export type PatternType =
  | 'urgency'
  | 'scarcity'
  | 'misdirection'
  | 'forced_action'
  | 'social_proof'
  | 'sneaking'
  | 'obstruction'
  | 'confirmshaming'
  | 'disguised_ads'
  | 'nagging'
  | 'trick_questions'
  | 'hidden_costs'
  | 'bait_and_switch'

export interface DarkPattern {
  pattern_type: PatternType
  severity: 1 | 2 | 3 | 4 | 5
  source_text: string
  page_section: string
  confidence: number
}

export interface ScanResult {
  url: string
  patterns: DarkPattern[]
  timestamp: string
  overall_score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

export interface MonsterConfig {
  pattern_type: PatternType
  monster_name: string
  color: string
  glowColor: string
  depth_range: [number, number]
}

export interface Encounter {
  id: string
  pattern: DarkPattern
  monster: MonsterConfig
  depth: number
  triggered: boolean
  completed: boolean
}

export interface DepthZone {
  name: string
  startDepth: number
  endDepth: number
  fogColor: string
  fogDensity: number
  ambientIntensity: number
  backgroundColor: string
}

export interface ScrapedElement {
  type: string
  text: string
  section: string
  attributes?: Record<string, string>
}
