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

  const prompt = `Read ALL pages of this bank statement PDF carefully and extract EVERY single financial transaction. Do not stop early, do not skip any transaction, process every page completely.

For each transaction output one line in this exact format:
DATE|DESCRIPTION|AMOUNT|TYPE

Rules:
- DATE: YYYY-MM-DD format
- DESCRIPTION: transaction description text
- AMOUNT: positive number, dot as decimal separator, no currency symbol
- TYPE: "expense" for debits/purchases/withdrawals, "income" for credits/deposits/salary

Output ONLY the data lines. No headers, no totals, no balance lines, no blank lines, no explanations.

Example output:
2024-01-15|Supermercado Extra|150.50|expense
2024-01-16|Salário Janeiro|3000.00|income
2024-01-17|Uber|25.90|expense

Now extract ALL transactions from ALL pages:`

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
          generationConfig: { maxOutputTokens: 8192, temperature: 0 },
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
