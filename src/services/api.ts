import type { ScrapedElement, ScanResult } from '../types'

export async function scanUrl(url: string): Promise<ScrapedElement[]> {
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

  const res = await fetch('https://agent.tinyfish.ai/v1/automation/run', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      goal: `Analyze this webpage for dark patterns and manipulative UI techniques. For each pattern found, return a JSON array of objects with fields: type (urgency/scarcity/misdirection/forced_action/social_proof/sneaking/obstruction/confirmshaming/disguised_ads/nagging/trick_questions/hidden_costs/bait_and_switch), text (the exact text), section (where on the page).`,
      browser_profile: 'stealth',
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`TinyFish API error ${res.status}: ${errText.substring(0, 200)}`)
  }

  const result = await res.json()
  return result.result || result.data || result
}

export async function classifyPatterns(
  url: string,
  elements: ScrapedElement[]
): Promise<ScanResult> {
  // Try serverless function first
  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, data: elements }),
    })
    if (res.ok) return res.json()
  } catch {
    // Fall through to direct call
  }

  // Direct OpenAI call from client (for local dev)
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('No API available. Set VITE_OPENAI_API_KEY in .env or run with vercel dev.')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a dark pattern analyst. Classify dark patterns from scraped webpage data. Use these categories: urgency, scarcity, misdirection, forced_action, social_proof, sneaking, obstruction, confirmshaming, disguised_ads, nagging, trick_questions, hidden_costs, bait_and_switch. Return JSON via function calling.`,
        },
        {
          role: 'user',
          content: `Analyze for dark patterns:\nURL: ${url}\nData: ${typeof elements === 'string' ? elements : JSON.stringify(elements)}`,
        },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'classify_dark_patterns',
          parameters: {
            type: 'object',
            properties: {
              patterns: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    pattern_type: { type: 'string' },
                    severity: { type: 'integer', minimum: 1, maximum: 5 },
                    source_text: { type: 'string' },
                    page_section: { type: 'string' },
                    confidence: { type: 'number' },
                  },
                  required: ['pattern_type', 'severity', 'source_text', 'page_section', 'confidence'],
                },
              },
            },
            required: ['patterns'],
          },
        },
      }],
      tool_choice: { type: 'function', function: { name: 'classify_dark_patterns' } },
    }),
  })

  if (!res.ok) throw new Error(`OpenAI API error: ${res.status}`)

  const data = await res.json()
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall?.function?.arguments) throw new Error('Classification failed: no tool call response')

  const classified = JSON.parse(toolCall.function.arguments)
  const patterns = classified.patterns || []
  const score = patterns.length === 0 ? 0 : Math.round(
    patterns.reduce((s: number, p: { severity: number; confidence: number }) => s + p.severity * (p.confidence || 1), 0) / (patterns.length * 5) * 100
  )

  return {
    url,
    patterns,
    overall_score: score,
    grade: score < 20 ? 'A' : score < 40 ? 'B' : score < 60 ? 'C' : score < 80 ? 'D' : 'F',
    timestamp: new Date().toISOString(),
  }
}
