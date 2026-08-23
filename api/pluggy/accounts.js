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
  const url = new URL(req.url)
  const itemId = url.searchParams.get('itemId')

  if (!itemId) {
    return new Response(JSON.stringify({ error: 'itemId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const apiKey = await getApiKey()

    const res = await fetch(`https://api.pluggy.ai/accounts?itemId=${itemId}`, {
      headers: { 'X-API-KEY': apiKey },
    })
    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
