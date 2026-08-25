import { callGemini, geminiErrorMessage } from './_gemini.js'

export const config = { runtime: 'edge' }

const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// Anything thrown outside a handler returns an HTML error page, and the client's
// res.json() then fails with an opaque parser error. Keep every exit as JSON.
export default async function handler(req) {
  try {
    return await chat(req)
  } catch (err) {
    return json({ error: `Erro interno do assistente: ${err.message}` }, 500)
  }
}

async function chat(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY not configured' }, 500)
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { message, history = [], financialData = {}, month } = body
  if (!message) {
    return json({ error: 'message is required' }, 400)
  }

  const { accounts = [], transactions = [], budgets = [] } = financialData

  const totalBalance = accounts.filter((a) => a.is_active).reduce((s, a) => s + (a.balance || 0), 0)

  // Transaction dates are local calendar dates, so the current month has to be
  // local too — and only the client knows the user's timezone. It sends the
  // month; the UTC month is just a fallback for an older client.
  const thisMonth = /^\d{4}-\d{2}$/.test(month || '')
    ? month
    : new Date().toISOString().slice(0, 7)

  const sum = (list) => list.reduce((s, t) => s + (t.amount || 0), 0)

  // Credit card bill payments are transfers between the user's own accounts.
  // They stay visible so each account mirrors the bank, but they are excluded
  // from the totals: the purchases behind them already count on the card.
  const isFlow = (t) => !t.is_transfer
  const monthlyIncome = sum(transactions.filter((t) => t.type === 'income' && isFlow(t) && t.date?.startsWith(thisMonth)))
  const monthlyExpenses = sum(transactions.filter((t) => t.type === 'expense' && isFlow(t) && t.date?.startsWith(thisMonth)))

  const categoryTotals = {}
  transactions
    .filter((t) => t.type === 'expense' && isFlow(t) && t.date?.startsWith(thisMonth))
    .forEach((t) => {
      const cat = t.category || 'Sem categoria'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (t.amount || 0)
    })

  // Formatted by hand rather than via toLocaleString: the edge runtime ships
  // limited ICU, so locale-aware formatting is not dependable here.
  const money = (n) => {
    const v = Number(n || 0)
    const [int, dec] = Math.abs(v).toFixed(2).split('.')
    const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${v < 0 ? '-' : ''}R$ ${grouped},${dec}`
  }
  const byDateDesc = (a, b) => (b.date || '').localeCompare(a.date || '')
  const line = (t) => `${t.date} | ${money(t.amount)} | ${t.category || 'Sem categoria'} | ${t.description || ''}`

  // Send the month in full, split by direction. Sending only a truncated recent
  // slice meant questions like "quais foram minhas receitas?" could only ever be
  // answered from whatever happened to fall inside that slice.
  const monthTxs = transactions.filter((t) => t.date?.startsWith(thisMonth))
  const monthIncome = monthTxs.filter((t) => t.type === 'income' && isFlow(t)).sort(byDateDesc)
  const monthExpenses = monthTxs.filter((t) => t.type === 'expense' && isFlow(t)).sort(byDateDesc)
  const monthTransfers = monthTxs.filter((t) => !isFlow(t)).sort(byDateDesc)

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
        .filter((t) => t.type === 'expense' && isFlow(t) && t.category === b.category && (!b.start_date || t.date >= b.start_date))
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

Pagamentos de fatura de ${thisMonth} (transferências entre contas do próprio
usuário — NÃO são despesas novas e já estão fora dos totais acima, porque as
compras correspondentes já foram contadas no cartão):
${monthTransfers.length ? monthTransfers.map(line).join('\n') : '  Nenhum'}

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
- Se não há dados suficientes para responder, diga isso claramente
- Pagamento de fatura do cartão não é uma despesa nova: é o dinheiro saindo da
  conta corrente para quitar compras que já foram contadas no cartão. Não
  inclua esses valores ao somar gastos, mas mencione-os se o usuário perguntar
  sobre movimentações da conta corrente.`

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
    return json({ error: err.message }, 500)
  }
}
