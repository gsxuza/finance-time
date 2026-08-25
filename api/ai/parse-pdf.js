import { callGemini, geminiErrorMessage } from './_gemini.js'

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { pdfBase64 } = req.body || {}
  if (!pdfBase64) {
    return res.status(400).json({ error: 'pdfBase64 is required' })
  }

  // Warn if PDF is too large (>6MB base64 ≈ 4.5MB file)
  if (pdfBase64.length > 6_000_000) {
    return res.status(413).json({ error: 'PDF muito grande. Tente um extrato menor (máx ~4MB).' })
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
    const { res: geminiRes, data, overloaded } = await callGemini(apiKey, {
      contents: [{
        parts: [
          { inline_data: { mime_type: 'application/pdf', data: pdfBase64 } },
          { text: prompt },
        ],
      }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0 },
    })

    if (!geminiRes.ok) {
      return res.status(overloaded ? 503 : 500).json({ error: geminiErrorMessage(data, overloaded) })
    }

    const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()

    if (!text) {
      const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'unknown'
      return res.status(422).json({ error: `Gemini não conseguiu ler o PDF (${reason}). O arquivo pode estar protegido ou ser uma imagem escaneada.` })
    }

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
      return res.status(422).json({ error: 'Nenhuma transação encontrada no PDF.', debug: text.slice(0, 400) })
    }

    return res.status(200).json({ transactions })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
