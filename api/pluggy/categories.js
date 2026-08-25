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

// Pluggy's own category taxonomy. Exposed so the import can map transactions
// onto it instead of guessing from the description text.
export default async function handler() {
  try {
    const apiKey = await getApiKey()
    const res = await fetch('https://api.pluggy.ai/categories', {
      headers: { 'X-API-KEY': apiKey },
    })
    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
