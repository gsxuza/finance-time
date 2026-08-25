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
  const accountId = url.searchParams.get('accountId')
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || ''
  const pageSize = url.searchParams.get('pageSize') || '50'

  if (!accountId) {
    return new Response(JSON.stringify({ error: 'accountId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const apiKey = await getApiKey()

    // Try with date range first; if Pluggy rejects it, fall back to no date filter
    const tryFetch = async (includeDate) => {
      const params = new URLSearchParams({ accountId, pageSize })
      if (includeDate && from) params.set('from', from)
      if (includeDate && to) params.set('to', to)
      const res = await fetch(`https://api.pluggy.ai/transactions?${params}`, {
        headers: { 'X-API-KEY': apiKey },
      })
      const data = await res.json()
      return { res, data }
    }

    let { res, data } = await tryFetch(true)

    // If date params caused a validation error, retry without them
    if (!res.ok && (data?.message || data?.error || '').toLowerCase().includes('pattern')) {
      ;({ res, data } = await tryFetch(false))
    }

    // 410 Gone = Pluggy item not ready or account data unavailable; return empty results gracefully
    if (res.status === 410) {
      return new Response(JSON.stringify({ results: [], total: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

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
