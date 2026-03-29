import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkRateLimit, isAdmin, getClientIp } from './_lib/rateLimit'

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
      // Include remaining in successful responses
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
