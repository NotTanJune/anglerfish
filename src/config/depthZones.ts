import type { DepthZone } from '../types'

export const DEPTH_ZONES: DepthZone[] = [
  {
    name: 'SUNLIGHT ZONE',
    startDepth: 0,
    endDepth: 100,
    fogColor: '#1a6fc4',
    fogDensity: 0.01,
    ambientIntensity: 0.8,
    backgroundColor: '#1a6fc4',
  },
  {
    name: 'TWILIGHT ZONE',
    startDepth: 100,
    endDepth: 500,
    fogColor: '#0a2a5e',
    fogDensity: 0.03,
    ambientIntensity: 0.4,
    backgroundColor: '#0a2a5e',
  },
  {
    name: 'MIDNIGHT ZONE',
    startDepth: 500,
    endDepth: 1000,
    fogColor: '#040e24',
    fogDensity: 0.06,
    ambientIntensity: 0.15,
    backgroundColor: '#040e24',
  },
  {
    name: 'THE ABYSS',
    startDepth: 1000,
    endDepth: Infinity,
    fogColor: '#000000',
    fogDensity: 0.1,
    ambientIntensity: 0.05,
    backgroundColor: '#000000',
  },
]

export function getZoneAtDepth(depth: number): DepthZone {
  for (let i = DEPTH_ZONES.length - 1; i >= 0; i--) {
    if (depth >= DEPTH_ZONES[i].startDepth) return DEPTH_ZONES[i]
  }
  return DEPTH_ZONES[0]
}

export function getZoneProgress(depth: number): number {
  const zone = getZoneAtDepth(depth)
  const range = zone.endDepth === Infinity ? 500 : zone.endDepth - zone.startDepth
  return Math.min(1, (depth - zone.startDepth) / range)
}

export function lerpZoneValues(depth: number) {
  const zone = getZoneAtDepth(depth)
  const zoneIndex = DEPTH_ZONES.indexOf(zone)
  const nextZone = DEPTH_ZONES[Math.min(zoneIndex + 1, DEPTH_ZONES.length - 1)]
  const progress = getZoneProgress(depth)

  return {
    zone,
    fogDensity: zone.fogDensity + (nextZone.fogDensity - zone.fogDensity) * progress,
    ambientIntensity: zone.ambientIntensity + (nextZone.ambientIntensity - zone.ambientIntensity) * progress,
  }
}
