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

  const prompt = `Look at this bank statement PDF and list every financial transaction you find.

For each transaction output one line in this exact format:
DATE|DESCRIPTION|AMOUNT|TYPE

Where:
- DATE is YYYY-MM-DD
- DESCRIPTION is the transaction description
- AMOUNT is a positive number (no currency symbol, use dot as decimal)
- TYPE is either "expense" or "income"

Output ONLY the data lines, no headers, no explanations, no empty lines.
Example:
2024-01-15|Supermercado Extra|150.50|expense
2024-01-16|Salário|3000.00|income`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
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

    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()

    if (!text) {
      const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'unknown'
      return new Response(JSON.stringify({ error: `Gemini não conseguiu ler o PDF (${reason}). O arquivo pode estar protegido ou ser uma imagem escaneada.` }), { status: 422 })
    }

    // Parse pipe-delimited lines
    const transactions = []
    for (const line of text.split('\n')) {
      const parts = line.trim().split('|')
      if (parts.length < 4) continue
      const [date, description, amountStr, type] = parts
      const amount = parseFloat(amountStr.replace(',', '.'))
      if (!date.match(/^\d{4}-\d{2}-\d{2}$/) || !amount || amount <= 0) continue
      transactions.push({
        date: date.trim(),
        description: description.trim(),
        amount,
        type: type.trim().toLowerCase() === 'income' ? 'income' : 'expense',
      })
    }

    if (transactions.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhuma transação encontrada no PDF.', debug: text.slice(0, 400) }), { status: 422 })
    }

    return new Response(JSON.stringify({ transactions }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
