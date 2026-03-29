import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { key } = req.query
  const secret = process.env.ADMIN_SECRET

  if (!secret || key !== secret) {
    return res.status(404).json({ error: 'Not found' })
  }

  // Set HttpOnly cookie that lasts 1 year
  res.setHeader('Set-Cookie', `anglerfish_admin=${secret}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`)
  return res.status(200).json({ ok: true })
}
