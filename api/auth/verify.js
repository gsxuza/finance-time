export const config = { runtime: 'edge' }

async function sha256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default async function handler(req) {
  const appPassword = process.env.APP_PASSWORD
  if (!appPassword) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = req.headers.get('x-auth-token')
  const expected = await sha256(appPassword + ':finance-time-secret')

  return new Response(JSON.stringify({ ok: token === expected }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
