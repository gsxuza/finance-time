import { callGemini, geminiErrorMessage } from './_gemini.js'

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

  // Transaction dates are local (YYYY-MM-DD), so the current month has to be
  // local too — deriving it from toISOString() puts the server's UTC month here,
  // which is the wrong month for a few hours around every month boundary.
  const thisMonth = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date()).slice(0, 7)

  const sum = (list) => list.reduce((s, t) => s + (t.amount || 0), 0)
  const monthlyIncome = sum(transactions.filter((t) => t.type === 'income' && t.date?.startsWith(thisMonth)))
  const monthlyExpenses = sum(transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(thisMonth)))

  const categoryTotals = {}
  transactions
    .filter((t) => t.type === 'expense' && t.date?.startsWith(thisMonth))
    .forEach((t) => {
      const cat = t.category || 'Sem categoria'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0)
    })

  const money = (n) =>
    `R$ ${Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '')
  const line = (t) => `${t.date} | ${money(t.amount)} | ${t.category || 'Sem categoria'} | ${t.description || ''}`

  // Send the month in full, split by direction. Sending only a truncated recent
  // slice meant questions like "quais foram minhas receitas?" could only ever be
  // answered from whatever happened to fall inside that slice.
  const monthTxs = transactions.filter((t) => t.date?.startsWith(thisMonth))
  const monthIncome = monthTxs.filter((t) => t.type === 'income').sort(byDateDesc)
  const monthExpenses = monthTxs.filter((t) => t.type === 'expense').sort(byDateDesc)

  const LIST_CAP = 300
  const renderList = (list) => {
    if (list.length === 0) return '  Nenhuma'
    const shown = list.slice(0, LIST_CAP).map(line).join('\n')
    return list.length > LIST_CAP
      ? `${shown}\n  (+${list.length - LIST_CAP} outras não listadas)`
      : shown
  }

  // Prior months, for trend questions
  const olderTxs = transactions
    .filter((t) => t.date && !t.date.startsWith(thisMonth))
    .sort(byDateDesc)
    .slice(0, 100)

  const budgetSummary = budgets
    .map((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category === b.category && (!b.start_date || t.date >= b.start_date))
        .reduce((s, t) => s + (t.amount || 0), 0)
      return `  ${b.category}: gasto ${money(spent)} de ${money(b.amount)}`
    })
    .join('\n')

  const systemPrompt = `Você é um assistente financeiro pessoal inteligente e amigável chamado "Finance AI". Você ajuda o usuário a entender e melhorar sua vida financeira.

DADOS FINANCEIROS ATUAIS DO USUÁRIO:

Saldo total: ${money(totalBalance)}
Receitas este mês (${thisMonth}): ${money(monthlyIncome)}
Despesas este mês: ${money(monthlyExpenses)}
Saldo mensal: ${money(monthlyIncome - monthlyExpenses)}

Contas:
${accounts.map((a) => `  ${a.name} (${a.type}): ${money(a.balance)}`).join('\n') || '  Nenhuma conta registrada'}

Gastos por categoria este mês:
${Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => `  ${cat}: ${money(val)}`).join('\n') || '  Nenhum gasto registrado'}

Orçamentos:
${budgetSummary || '  Nenhum orçamento definido'}

TODAS as receitas de ${thisMonth} (${monthIncome.length} no total, somando ${money(monthlyIncome)}):
${renderList(monthIncome)}

TODAS as despesas de ${thisMonth} (${monthExpenses.length} no total, somando ${money(monthlyExpenses)}):
${renderList(monthExpenses)}

Transações de meses anteriores (até 100 mais recentes):
${olderTxs.length ? olderTxs.map((t) => `${line(t)} | ${t.type === 'income' ? 'receita' : 'despesa'}`).join('\n') : '  Nenhuma'}

INSTRUÇÕES:
- Responda sempre em português brasileiro, em tom natural e conversacional
- Escreva em texto corrido. NÃO use markdown: nada de **, ##, ou tabelas.
  Para listas, use um hífen no início da linha e quebre linha entre os itens.
- As listas de receitas e despesas acima são COMPLETAS para o mês atual.
  Quando o usuário pedir "quais foram minhas receitas/despesas", liste todas
  elas, não apenas as mais recentes. Só diga que algo não está listado se a
  lista realmente indicar que há itens omitidos.
- Baseie tudo nos dados reais acima e confira as somas antes de responder
- Seja completo: explique o que os números significam e o que chama atenção
- Dê conselhos práticos e personalizados quando fizer sentido
- Se não há dados suficientes para responder, diga isso claramente`

  // Gemini uses "model" for assistant role
  const contents = [
    ...history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ]

  try {
    const { res, data, overloaded } = await callGemini(apiKey, {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 4096, temperature: 0.7 },
    })

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: geminiErrorMessage(data, overloaded) }),
        { status: overloaded ? 503 : 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return new Response(JSON.stringify({ reply }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
}
