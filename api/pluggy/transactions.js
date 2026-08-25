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

// The `next` field comes back as a link (or query string) carrying the base64
// cursor in an `after` param. Pull it out however it happens to be shaped.
function extractCursor(next) {
  if (!next || typeof next !== 'string') return null
  try {
    return new URL(next, 'https://api.pluggy.ai').searchParams.get('after')
  } catch {
    const match = next.match(/[?&]after=([^&]+)/)
    return match ? decodeURIComponent(match[1]) : next
  }
}

const MAX_PAGES = 20

export default async function handler(req) {
  const url = new URL(req.url)
  const accountId = url.searchParams.get('accountId')
  // Accept the legacy from/to names the client already sends
  const dateFrom = url.searchParams.get('dateFrom') || url.searchParams.get('from') || ''
  const dateTo = url.searchParams.get('dateTo') || url.searchParams.get('to') || ''

  if (!accountId) {
    return new Response(JSON.stringify({ error: 'accountId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const apiKey = await getApiKey()

    const fetchPage = async (after, withDates) => {
      const params = new URLSearchParams({ accountId })
      if (withDates && dateFrom) params.set('dateFrom', dateFrom)
      if (withDates && dateTo) params.set('dateTo', dateTo)
      if (after) params.set('after', after)
      const res = await fetch(`https://api.pluggy.ai/v2/transactions?${params}`, {
        headers: { 'X-API-KEY': apiKey },
      })
      const data = await res.json()
      return { res, data }
    }

    // Probe the first page; if the date filter is rejected, retry unfiltered.
    let withDates = true
    let { res, data } = await fetchPage(null, withDates)
    if (!res.ok && (dateFrom || dateTo)) {
      withDates = false
      ;({ res, data } = await fetchPage(null, withDates))
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          results: [],
          total: 0,
          _pluggyStatus: res.status,
          _pluggyMessage: data?.message || data?.error || `HTTP ${res.status}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const results = [...(data.results || [])]
    let cursor = extractCursor(data.next)

    for (let page = 1; page < MAX_PAGES && cursor; page++) {
      const nextPage = await fetchPage(cursor, withDates)
      if (!nextPage.res.ok) break
      results.push(...(nextPage.data.results || []))
      cursor = extractCursor(nextPage.data.next)
    }

    return new Response(JSON.stringify({ results, total: results.length }), {
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
