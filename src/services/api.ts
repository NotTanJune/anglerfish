// Calls TinyFish synchronous /run endpoint and returns raw result
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scanUrl(url: string): Promise<any> {
  // Try serverless function first (Vercel deployment)
  try {
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (res.ok) {
      const json = await res.json()
      console.log('[scan] serverless response:', json)
      return json.data
    }
  } catch {
    // Not available, try direct
  }

  // Direct call via Vite proxy (local dev)
  const apiKey = import.meta.env.VITE_TINYFISH_API_KEY
  if (!apiKey) {
    throw new Error('Set VITE_TINYFISH_API_KEY in .env')
  }

  const base = import.meta.env.DEV ? '/tinyfish-proxy' : 'https://agent.tinyfish.ai'

  console.log('[scan] calling TinyFish /run for:', url)

  const res = await fetch(`${base}/v1/automation/run`, {
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

  if (!res.ok) {
    const errText = await res.text()
    console.error('[scan] TinyFish error:', res.status, errText)
    throw new Error(`TinyFish error ${res.status}: ${errText.substring(0, 300)}`)
  }

  const json = await res.json()
  console.log('[scan] TinyFish response:', JSON.stringify(json).substring(0, 500))

  // The sync endpoint returns { run_id, status, result, ... }
  // result contains the actual data (could be string or object)
  let result = json.result ?? json.data ?? json

  // If result is a string, try to parse it as JSON
  if (typeof result === 'string') {
    try { result = JSON.parse(result) } catch { /* keep as string */ }
  }

  return result
}
