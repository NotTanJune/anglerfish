import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { run_id } = req.query

    if (!run_id || typeof run_id !== 'string') {
      return res.status(400).json({ error: 'run_id is required' })
    }

    const apiKey = process.env.TINYFISH_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'TINYFISH_API_KEY not configured' })
    }

    const response = await fetch(`https://agent.tinyfish.ai/v1/runs/${run_id}`, {
      headers: { 'X-API-Key': apiKey },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TinyFish poll error:', response.status, errorText)
      return res.status(502).json({ error: `TinyFish error ${response.status}` })
    }

    const json = await response.json()

    // Extract result when completed
    let result = json.result ?? null
    if (typeof result === 'string') {
      try { result = JSON.parse(result) } catch { /* keep */ }
    }

    return res.status(200).json({
      status: json.status,
      result,
      streamingUrl: json.streaming_url ?? json.streamingUrl ?? null,
      goal: json.goal ?? null,
    })

  } catch (error) {
    console.error('Poll handler error:', error)
    return res.status(500).json({ error: 'Poll failed', details: error instanceof Error ? error.message : String(error) })
  }
}
