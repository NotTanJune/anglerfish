export class RateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

export async function startScan(url: string): Promise<string> {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
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
  const res = await fetch(`/api/poll?run_id=${encodeURIComponent(runId)}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error || `Poll failed: ${res.status}`)
  }
  return res.json()
}
