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

  const { message, history = [], financialData = {} } = body
  if (!message) {
    return new Response(JSON.stringify({ error: 'message is required' }), { status: 400 })
  }

  const { accounts = [], transactions = [], budgets = [] } = financialData

  const totalBalance = accounts.filter((a) => a.is_active).reduce((s, a) => s + (a.balance || 0), 0)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyIncome = transactions.filter((t) => t.type === 'income' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0)
  const monthlyExpenses = transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0)

  const categoryTotals = {}
  transactions
    .filter((t) => t.type === 'expense' && t.date?.startsWith(thisMonth))
    .forEach((t) => { categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount })

  const recentTxs = transactions
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 20)
    .map((t) => `${t.date} | ${t.type === 'income' ? '+' : '-'}R$${t.amount.toFixed(2)} | ${t.category} | ${t.description || ''}`)
    .join('\n')

  const budgetSummary = budgets
    .map((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && t.date >= b.start_date)
        .reduce((s, t) => s + t.amount, 0)
      return `${b.category}: gasto R$${spent.toFixed(2)} de R$${b.amount.toFixed(2)}`
    })
    .join('\n')

  const systemPrompt = `Você é um assistente financeiro pessoal inteligente e amigável chamado "Finance AI". Você ajuda o usuário a entender e melhorar sua vida financeira.

DADOS FINANCEIROS ATUAIS DO USUÁRIO:

Saldo total: R$${totalBalance.toFixed(2)}
Receitas este mês (${thisMonth}): R$${monthlyIncome.toFixed(2)}
Despesas este mês: R$${monthlyExpenses.toFixed(2)}
Saldo mensal: R$${(monthlyIncome - monthlyExpenses).toFixed(2)}

Gastos por categoria este mês:
${Object.entries(categoryTotals).map(([cat, val]) => `  ${cat}: R$${val.toFixed(2)}`).join('\n') || '  Nenhum gasto registrado'}

Orçamentos:
${budgetSummary || '  Nenhum orçamento definido'}

Últimas 20 transações:
${recentTxs || '  Nenhuma transação registrada'}

Contas:
${accounts.map((a) => `  ${a.name} (${a.type}): R$${(a.balance || 0).toFixed(2)}`).join('\n') || '  Nenhuma conta registrada'}

INSTRUÇÕES:
- Responda sempre em português brasileiro
- Seja direto, amigável e use formatação simples (sem markdown excessivo)
- Baseie suas respostas nos dados reais do usuário acima
- Para perguntas sobre gastos, calcule com base nas transações reais
- Dê conselhos práticos e personalizados
- Se não há dados suficientes para responder, diga isso claramente
- Mantenha respostas concisas (máximo 3-4 parágrafos)`

  // Gemini uses "model" for assistant role
  const contents = [
    ...history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ]

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    )

    const data = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'Gemini API error' }), { status: 500 })
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
