import type { VercelRequest, VercelResponse } from '@vercel/node'
import { DARK_PATTERN_TAXONOMY, CLASSIFICATION_TOOLS } from './_lib/taxonomy'
import { getFallbackData } from './_lib/fallback'

export const config = {
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, data } = req.body

  if (!data) {
    return res.status(400).json({ error: 'Scraped data is required' })
  }

  // If the data is already classified (from fallback), pass through
  if (Array.isArray(data) && data[0]?.pattern_type) {
    const score = calculateScore(data)
    const grade = calculateGrade(score)
    return res.status(200).json({
      url,
      patterns: data,
      overall_score: score,
      grade,
      timestamp: new Date().toISOString(),
    })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // Fall back to fallback data if no API key
    const fallback = getFallbackData(url || '')
    if (fallback) {
      const score = calculateScore(fallback.patterns)
      const grade = calculateGrade(score)
      return res.status(200).json({
        url,
        patterns: fallback.patterns,
        overall_score: score,
        grade,
        timestamp: new Date().toISOString(),
      })
    }
    return res.status(500).json({ error: 'OpenAI API key not configured' })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a dark pattern analyst. Given scraped webpage data, classify every dark pattern and manipulation tactic you can identify.

${DARK_PATTERN_TAXONOMY}

Be thorough. Real websites often have 5-15+ dark patterns. Assign severity from 1 (minor nudge) to 5 (extremely manipulative). Include the exact source text from the page when possible.`,
          },
          {
            role: 'user',
            content: `Analyze this scraped webpage data for dark patterns:\n\nURL: ${url}\n\nPage data:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`,
          },
        ],
        tools: CLASSIFICATION_TOOLS,
        tool_choice: {
          type: 'function',
          function: { name: 'classify_dark_patterns' },
        },
      }),
    })

    const result = await response.json()

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0]
    if (toolCall?.function?.arguments) {
      const classified = JSON.parse(toolCall.function.arguments)
      const patterns = classified.patterns || []

      const score = calculateScore(patterns)
      const grade = calculateGrade(score)

      return res.status(200).json({
        url,
        patterns,
        overall_score: score,
        grade,
        timestamp: new Date().toISOString(),
      })
    }

    return res.status(500).json({ error: 'Classification failed', details: result })
  } catch (error) {
    console.error('Classification error:', error)
    return res.status(500).json({ error: 'Classification failed', details: String(error) })
  }
}

function calculateScore(patterns: { severity: number; confidence: number }[]): number {
  if (patterns.length === 0) return 0
  const raw = patterns.reduce((sum, p) => sum + p.severity * (p.confidence || 1), 0)
  const maxPossible = patterns.length * 5
  return Math.round((raw / maxPossible) * 100)
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score < 20) return 'A'
  if (score < 40) return 'B'
  if (score < 60) return 'C'
  if (score < 80) return 'D'
  return 'F'
}
