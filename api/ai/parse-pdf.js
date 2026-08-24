export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), { status: 500 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { pdfBase64 } = body
  if (!pdfBase64) {
    return new Response(JSON.stringify({ error: 'pdfBase64 is required' }), { status: 400 })
  }

  const prompt = `Extract all financial transactions from this bank statement PDF.

IMPORTANT: Respond with ONLY a raw JSON object. No markdown, no code fences, no explanations. Just the JSON.

Required format:
{"transactions":[{"date":"YYYY-MM-DD","description":"transaction description","amount":150.00,"type":"expense"}]}

Rules:
- date: ISO format YYYY-MM-DD only
- amount: positive number, no sign
- type: "expense" for debits/withdrawals/purchases, "income" for credits/deposits/salary
- Include ALL transactions in the document
- Skip balance lines, totals, headers
- Default to "expense" when unclear
- If the PDF has no readable text (scanned image), return {"transactions":[]}`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'application/pdf',
                  data: pdfBase64,
                },
              },
              { text: prompt },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                transactions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      description: { type: 'string' },
                      amount: { type: 'number' },
                      type: { type: 'string' },
                    },
                    required: ['date', 'description', 'amount', 'type'],
                  },
                },
              },
              required: ['transactions'],
            },
          },
        }),
      }
    )

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API error' }), { status: 500 })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Strip markdown fences and find JSON
    let clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Try to extract JSON object if there's surrounding text
    const jsonMatch = clean.match(/\{[\s\S]*\}/)
    if (jsonMatch) clean = jsonMatch[0]

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      // Last resort: try to find a transactions array directly
      const arrMatch = text.match(/\[[\s\S]*\]/)
      if (arrMatch) {
        try {
          parsed = { transactions: JSON.parse(arrMatch[0]) }
        } catch {
          return new Response(JSON.stringify({ error: 'Não foi possível interpretar o PDF. O arquivo pode ser escaneado (imagem) — tente exportar como PDF de texto ou use CSV.' }), { status: 422 })
        }
      } else {
        return new Response(JSON.stringify({ error: 'Não foi possível interpretar o PDF. O arquivo pode ser escaneado (imagem) — tente exportar como PDF de texto ou use CSV.' }), { status: 422 })
      }
    }

    const transactions = (parsed.transactions || []).filter(
      (t) => t.date && t.amount > 0
    )

    return new Response(JSON.stringify({ transactions }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
