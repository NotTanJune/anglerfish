import type { ScrapedElement, ScanResult } from '../types'

export async function scanUrl(url: string): Promise<ScrapedElement[]> {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) throw new Error(`Scan failed: ${res.status}`)
  const data = await res.json()
  return data.data
}

export async function classifyPatterns(
  url: string,
  elements: ScrapedElement[]
): Promise<ScanResult> {
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, data: elements }),
  })
  if (!res.ok) throw new Error(`Classification failed: ${res.status}`)
  return res.json()
}
