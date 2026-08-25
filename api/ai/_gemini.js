export const GEMINI_MODEL = 'gemini-3.6-flash'

// Gemini sheds load with 429/503 ("model is currently experiencing high demand").
// Those are transient, so retry with exponential backoff plus jitter before
// surfacing the failure to the user.
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504, 529])
const BACKOFF_MS = [600, 1800, 4000]

export async function callGemini(apiKey, payload, { model = GEMINI_MODEL } = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  let res, data
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt++) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (res.ok || !RETRY_STATUSES.has(res.status) || attempt === BACKOFF_MS.length) break

    const wait = BACKOFF_MS[attempt] + Math.floor(Math.random() * 300)
    await new Promise((r) => setTimeout(r, wait))
  }

  return { res, data, overloaded: !res.ok && RETRY_STATUSES.has(res.status) }
}

// A load-shedding failure is worth telling the user to retry; anything else is not.
export function geminiErrorMessage(data, overloaded) {
  if (overloaded) {
    return 'O assistente está sobrecarregado no momento. Aguarde alguns segundos e tente novamente.'
  }
  return data?.error?.message || 'Gemini API error'
}
