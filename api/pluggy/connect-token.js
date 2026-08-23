export const config = { runtime: 'edge' }

async function getApiKey() {
  const res = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Auth failed')
  return data.apiKey
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const apiKey = await getApiKey()

    // Parse optional itemId from body (for reconnect flow)
    let body = {}
    try {
      const text = await req.text()
      if (text) body = JSON.parse(text)
    } catch {}

    const payload = {}
    if (body.itemId) payload.itemId = body.itemId

    const res = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.message || 'Failed to create connect token' }), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ accessToken: data.accessToken }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
