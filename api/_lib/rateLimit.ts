// Simple in-memory rate limiter per IP
// Vercel serverless functions can share memory within the same instance,
// but cold starts reset it. This is sufficient for basic abuse prevention.

const DAILY_LIMIT = 3
const store = new Map<string, { count: number; resetAt: number }>()

function getStartOfDay(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  // Admin bypass: check if request includes the admin secret
  // (handled by caller, not here)

  const now = Date.now()
  const dayStart = getStartOfDay()
  const dayEnd = dayStart + 24 * 60 * 60 * 1000

  let entry = store.get(ip)

  // Reset if entry is from a previous day
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: dayEnd }
    store.set(ip, entry)
  }

  entry.count++

  // Clean old entries periodically (every 100 checks)
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

export function isAdmin(req: { headers: Record<string, string | string[] | undefined> }): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const header = req.headers['x-admin-secret']
  return header === secret
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  if (Array.isArray(forwarded)) return forwarded[0].split(',')[0].trim()
  return req.socket?.remoteAddress ?? 'unknown'
}
