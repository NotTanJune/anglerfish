import type { VercelRequest, VercelResponse } from '@vercel/node'

// ── Inline rate limiter (avoids _lib import issues in Vercel bundler) ──
const DAILY_LIMIT = 3
const store = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000

  let entry = store.get(ip)
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: dayEnd }
    store.set(ip, entry)
  }
  entry.count++

  if (Math.random() < 0.01) {
    for (const [key, val] of store.entries()) {
      if (val.resetAt <= now) store.delete(key)
    }
  }

  return {
    allowed: entry.count <= DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - entry.count),
  }
}

function isAdmin(req: VercelRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const cookieHeader = req.headers['cookie']
  if (typeof cookieHeader === 'string') {
    const match = cookieHeader.match(/anglerfish_admin=([^;]+)/)
    if (match && match[1] === secret) return true
  }
  return false
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  if (Array.isArray(forwarded)) return forwarded[0].split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}

// ── Handler ──
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url } = req.body || {}

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' })
    }

    // Rate limit check (skip for admin)
    if (!isAdmin(req)) {
      const ip = getClientIp(req)
      const { allowed, remaining } = checkRateLimit(ip)
      if (!allowed) {
        return res.status(429).json({
          error: 'rate_limited',
          message: 'Daily exploration limit reached. Try again tomorrow.',
          remaining: 0,
        })
      }
      res.setHeader('X-Rate-Remaining', String(remaining))
    }

    const apiKey = process.env.TINYFISH_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'TINYFISH_API_KEY not configured' })
    }

    const response = await fetch('https://agent.tinyfish.ai/v1/automation/run-async', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        goal: `Analyze this webpage for dark patterns and manipulative UI techniques.

Return a JSON object with a "dark_patterns" array. Each item must have:
- "type": one of urgency, scarcity, misdirection, forced_action, social_proof, sneaking, obstruction, confirmshaming, disguised_ads, nagging, trick_questions, hidden_costs, bait_and_switch
- "text": the exact text or UI element found
- "section": where on the page it appears`,
        browser_profile: 'lite',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TinyFish async start error:', response.status, errorText)
      return res.status(502).json({ error: `TinyFish error ${response.status}`, details: errorText.substring(0, 500) })
    }

    const json = await response.json()
    const run_id = json.run_id ?? json.id

    if (!run_id) {
      console.error('TinyFish returned no run_id:', json)
      return res.status(502).json({ error: 'TinyFish did not return a run_id' })
    }

    return res.status(200).json({ run_id })

  } catch (error) {
    console.error('Scan handler error:', error)
    return res.status(500).json({ error: 'Scan failed', details: error instanceof Error ? error.message : String(error) })
  }
}
