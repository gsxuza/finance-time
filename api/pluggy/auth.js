export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({ error: 'Pluggy credentials not configured. Add PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET to Vercel environment variables.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const res = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
  })

  const data = await res.json()

  if (!res.ok) {
    return new Response(JSON.stringify({ error: data.message || 'Auth failed' }), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ apiKey: data.apiKey }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
