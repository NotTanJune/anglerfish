import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getFallbackData } from './_lib/fallback'

export const config = {
  maxDuration: 60,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' })
  }

  // Check fallback data first
  const fallback = getFallbackData(url)
  if (fallback) {
    return res.status(200).json({ success: true, data: fallback.patterns, source: 'fallback' })
  }

  // Call TinyFish API
  const apiKey = process.env.TINYFISH_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'TinyFish API key not configured' })
  }

  try {
    const response = await fetch('https://agent.tinyfish.ai/v1/automation/run-sse', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        goal: `Analyze this webpage for dark patterns and manipulative UI techniques.

Look for these specific patterns:
- Urgency: countdown timers, "limited time" messages
- Scarcity: "only X left", limited stock claims
- Misdirection: highlighted preferred options vs hidden alternatives
- Forced Action: required account creation, mandatory steps
- Social Proof: "X people viewing", "recently purchased" notifications
- Sneaking: pre-checked boxes, auto-enrolled subscriptions
- Obstruction: difficult cancellation, hidden unsubscribe
- Confirmshaming: guilt-tripping decline buttons
- Disguised Ads: ads styled as content or navigation
- Nagging: repeated prompts for declined actions
- Trick Questions: confusing double-negatives, misleading toggles
- Hidden Costs: fees revealed late in checkout
- Bait & Switch: advertised features behind paywalls

For each dark pattern found, extract:
1. The exact text or UI element description
2. Which section of the page it appears in
3. The type of manipulation technique used

Return results as a JSON array of objects with fields: type, text, section`,
        browser_profile: 'stealth',
      }),
    })

    // Read SSE stream to completion
    const text = await response.text()

    // Parse SSE events
    const lines = text.split('\n')
    let lastData = ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        lastData = line.slice(6)
      }
    }

    if (lastData) {
      try {
        const parsed = JSON.parse(lastData)
        const result = parsed.result || parsed.data || parsed
        return res.status(200).json({ success: true, data: result, source: 'tinyfish' })
      } catch {
        return res.status(200).json({ success: true, data: lastData, source: 'tinyfish-raw' })
      }
    }

    return res.status(500).json({ error: 'No data received from TinyFish' })
  } catch (error) {
    console.error('TinyFish scan error:', error)
    return res.status(500).json({ error: 'Scan failed', details: String(error) })
  }
}
