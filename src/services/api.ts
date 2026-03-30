export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export async function startScan(url: string): Promise<string> {
  let res: Response
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Scan request timed out. The server may be unavailable.')
    }
    throw new Error('Network error: could not reach scan API. Are you running vercel dev?')
  }
  if (res.status === 429) {
    throw new RateLimitError('Daily exploration limit reached. Try again tomorrow.')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Scan start failed: ${res.status}`)
  }
  const json = await res.json()
  if (!json.run_id) throw new Error('No run_id returned from scan')
  return json.run_id
}

export interface PollResult {
  status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
  streamingUrl: string | null
}

export async function pollScan(runId: string): Promise<PollResult> {
  let res: Response
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    res = await fetch(`/api/poll?run_id=${encodeURIComponent(runId)}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Poll request timed out')
    }
    throw new Error('Network error while polling scan status')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Poll failed: ${res.status}`)
  }
  return res.json()
}
