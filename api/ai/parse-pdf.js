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

  const prompt = `Você é um extrator de dados financeiros. Analise este extrato bancário em PDF e extraia TODAS as transações financeiras.

Retorne SOMENTE um JSON válido no seguinte formato (sem texto adicional, sem markdown, sem \`\`\`json):
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "descrição da transação",
      "amount": 150.00,
      "type": "expense"
    }
  ]
}

Regras:
- "date" deve estar no formato YYYY-MM-DD
- "amount" deve ser um número positivo (sem sinal)
- "type" deve ser "expense" para débitos/saídas e "income" para créditos/entradas
- Inclua TODAS as transações visíveis no extrato
- Ignore saldos, totais e linhas de cabeçalho
- Se não conseguir determinar o tipo, use "expense"`

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
          generationConfig: { maxOutputTokens: 4096, temperature: 0 },
        }),
      }
    )

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API error' }), { status: 500 })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Strip markdown fences if present
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch {
      return new Response(JSON.stringify({ error: 'Não foi possível interpretar o PDF. Tente o formato CSV.' }), { status: 422 })
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
