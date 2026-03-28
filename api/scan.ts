import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  maxDuration: 60,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { url } = req.body || {}

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' })
    }

    const apiKey = process.env.TINYFISH_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'TINYFISH_API_KEY not configured in environment variables' })
    }

    // Call TinyFish synchronous automation endpoint
    const response = await fetch('https://agent.tinyfish.ai/v1/automation/run', {
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

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TinyFish API error:', response.status, errorText)
      return res.status(502).json({
        error: `TinyFish API returned ${response.status}`,
        details: errorText.substring(0, 500),
      })
    }

    const result = await response.json()

    // Extract the data from the response
    const data = result.result || result.data || result
    return res.status(200).json({ success: true, data, source: 'tinyfish' })

  } catch (error) {
    console.error('Scan handler error:', error)
    return res.status(500).json({
      error: 'Scan failed',
      details: error instanceof Error ? error.message : String(error),
    })
  }
}
