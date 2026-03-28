// Returns raw TinyFish response data - mapped to DarkPattern[] in App.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scanUrl(url: string): Promise<any> {
  // Try serverless function first (works on Vercel deployment)
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (res.ok) {
      const data = await res.json()
      return data.data
    }
  } catch {
    // Serverless function not available, fall through to direct call
  }

  // Direct TinyFish API call (works in local dev without vercel dev)
  const apiKey = import.meta.env.VITE_TINYFISH_API_KEY
  if (!apiKey) {
    throw new Error('No API available. Set VITE_TINYFISH_API_KEY in .env or run with vercel dev.')
  }

  // Use Vite proxy in dev to avoid CORS, direct URL in production
  const tinyFishBase = import.meta.env.DEV ? '/tinyfish-proxy' : 'https://agent.tinyfish.ai'
  const res = await fetch(`${tinyFishBase}/v1/automation/run-sse`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      goal: `Analyze this webpage for dark patterns and manipulative UI techniques.

Look for: urgency timers, scarcity claims, misdirection, forced actions, fake social proof, sneaking (pre-checked boxes), obstruction (hard cancellation), confirmshaming, disguised ads, nagging popups, trick questions, hidden costs, bait and switch.

Return a JSON object with a "dark_patterns" array. Each item should have: "type" (one of: urgency, scarcity, misdirection, forced_action, social_proof, sneaking, obstruction, confirmshaming, disguised_ads, nagging, trick_questions, hidden_costs, bait_and_switch), "text" (the exact text or element), "section" (where on the page).`,
      browser_profile: 'lite',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`TinyFish API error ${res.status}: ${errText.substring(0, 200)}`)
  }

  // Handle SSE response: read stream, extract last data event
  const text = await res.text()
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
      // TinyFish wraps result in { result: ... } or returns directly
      return parsed.result || parsed.data || parsed
    } catch {
      return lastData
    }
  }

  throw new Error('No data received from TinyFish')
}
