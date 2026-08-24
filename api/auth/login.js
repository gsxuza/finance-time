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
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const appPassword = process.env.APP_PASSWORD
  if (!appPassword) {
    return new Response(JSON.stringify({ error: 'APP_PASSWORD not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (body.password !== appPassword) {
    return new Response(JSON.stringify({ error: 'Senha incorreta' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const token = await sha256(appPassword + ':finance-time-secret')

  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
