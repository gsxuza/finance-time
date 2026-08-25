import { currentMonth, countsAsFlow } from './utils'

// ─── Dimension weights ────────────────────────────────────────────────────────
// Total: 100 pts
// 1. Savings rate        30
// 2. Budget adherence    25
// 3. Balance health      20
// 4. Financial planning  15
// 5. Monthly flow        10

export function computeHealthScore({ transactions, accounts, budgets, goals, recurringItems = [] }) {
  const month = currentMonth()

  // ── 1. Savings rate (30 pts) ─────────────────────────────────────────────
  const income = transactions
    .filter((t) => t.type === 'income' && countsAsFlow(t) && t.date?.startsWith(month))
    .reduce((s, t) => s + (t.amount || 0), 0)
  const expenses = transactions
    .filter((t) => t.type === 'expense' && countsAsFlow(t) && t.date?.startsWith(month))
    .reduce((s, t) => s + (t.amount || 0), 0)

  const savingRate = income > 0 ? ((income - expenses) / income) * 100 : null
  let savingsScore = 0
  let savingsNote = 'Sem receitas registradas este mês'
  if (savingRate === null) {
    savingsScore = 0
  } else if (savingRate >= 30) {
    savingsScore = 30
    savingsNote = `Taxa de poupança excelente: ${savingRate.toFixed(0)}% da renda`
  } else if (savingRate >= 20) {
    savingsScore = 22
    savingsNote = `Taxa de poupança boa: ${savingRate.toFixed(0)}% da renda`
  } else if (savingRate >= 10) {
    savingsScore = 14
    savingsNote = `Taxa de poupança razoável: ${savingRate.toFixed(0)}% — meta: 20%+`
  } else if (savingRate >= 0) {
    savingsScore = 6
    savingsNote = `Poupando apenas ${savingRate.toFixed(0)}% — aumentar é prioridade`
  } else {
    savingsScore = 0
    savingsNote = `Despesas superam receitas em ${Math.abs(savingRate).toFixed(0)}%`
  }

  // ── 2. Budget adherence (25 pts) ─────────────────────────────────────────
  const activeBudgets = budgets.filter((b) => b.is_active)
  let budgetScore = 10 // neutral when no budgets
  let budgetNote = 'Nenhum orçamento criado — crie para ganhar pontos'
  if (activeBudgets.length > 0) {
    const usages = activeBudgets.map((b) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && countsAsFlow(t) && t.category === b.category && t.date >= b.start_date)
        .reduce((s, t) => s + t.amount, 0)
      return b.amount > 0 ? (spent / b.amount) * 100 : 0
    })
    const avgUsage = usages.reduce((s, u) => s + u, 0) / usages.length
    const overCount = usages.filter((u) => u > 100).length

    if (overCount === 0 && avgUsage <= 70) {
      budgetScore = 25
      budgetNote = `Todos os orçamentos no controle (média ${avgUsage.toFixed(0)}%)`
    } else if (overCount === 0 && avgUsage <= 90) {
      budgetScore = 18
      budgetNote = `Orçamentos sob controle (média ${avgUsage.toFixed(0)}%)`
    } else if (overCount === 0) {
      budgetScore = 11
      budgetNote = `Próximo do limite em alguns orçamentos (média ${avgUsage.toFixed(0)}%)`
    } else {
      budgetScore = Math.max(0, 8 - overCount * 3)
      budgetNote = `${overCount} orçamento(s) estourado(s) — revise os gastos`
    }
  }

  // ── 3. Balance health (20 pts) ───────────────────────────────────────────
  const totalAssets = accounts.filter((a) => a.is_active && a.type !== 'credit_card').reduce((s, a) => s + a.balance, 0)
  const totalDebt = accounts.filter((a) => a.is_active && a.type === 'credit_card').reduce((s, a) => s + Math.abs(Math.min(0, a.balance)), 0)
  const debtRatio = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : totalDebt > 0 ? 100 : 0

  let balanceScore = 0
  let balanceNote = ''
  if (totalAssets <= 0 && totalDebt > 0) {
    balanceScore = 0
    balanceNote = 'Patrimônio negativo — dívidas superam ativos'
  } else if (totalDebt === 0) {
    balanceScore = 20
    balanceNote = accounts.length > 0 ? 'Sem dívidas de cartão — ótimo!' : 'Adicione suas contas para avaliar'
  } else if (debtRatio < 15) {
    balanceScore = 16
    balanceNote = `Dívida saudável: ${debtRatio.toFixed(0)}% dos ativos`
  } else if (debtRatio < 30) {
    balanceScore = 11
    balanceNote = `Dívida moderada: ${debtRatio.toFixed(0)}% dos ativos`
  } else if (debtRatio < 60) {
    balanceScore = 5
    balanceNote = `Dívida alta: ${debtRatio.toFixed(0)}% dos ativos — priorize quitar`
  } else {
    balanceScore = 0
    balanceNote = `Dívida crítica: ${debtRatio.toFixed(0)}% dos ativos`
  }

  // ── 4. Financial planning (15 pts) ──────────────────────────────────────
  const hasGoals = goals.filter((g) => g.target_amount > g.current_amount).length > 0
  const hasBudgets = activeBudgets.length > 0
  const hasRecurring = recurringItems.filter((r) => r.is_active).length >= 2
  const planningCount = [hasGoals, hasBudgets, hasRecurring].filter(Boolean).length

  const planningScore = [0, 5, 10, 15][planningCount]
  const planningNote = planningCount === 3
    ? 'Planejamento completo: metas, orçamentos e fluxo de caixa'
    : planningCount === 2
    ? 'Bom planejamento — adicione ' + (!hasGoals ? 'metas financeiras' : !hasBudgets ? 'orçamentos por categoria' : 'recorrências no fluxo de caixa')
    : planningCount === 1
    ? 'Planejamento iniciante — explore orçamentos, metas e fluxo de caixa'
    : 'Sem planejamento — crie orçamentos, metas e recorrências'

  // ── 5. Monthly flow (10 pts) ─────────────────────────────────────────────
  const net = income - expenses
  let flowScore = 0
  let flowNote = ''
  if (income === 0) {
    flowScore = 0
    flowNote = 'Registre suas receitas do mês'
  } else if (net > income * 0.1) {
    flowScore = 10
    flowNote = `Saldo positivo de ${((net / income) * 100).toFixed(0)}% da renda`
  } else if (net >= 0) {
    flowScore = 5
    flowNote = 'Receitas cobrem despesas, sem folga'
  } else {
    flowScore = 0
    flowNote = 'Despesas maiores que receitas este mês'
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  const total = savingsScore + budgetScore + balanceScore + planningScore + flowScore

  const grade = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : total >= 40 ? 'D' : 'F'
  const gradeLabel = { A: 'Excelente', B: 'Bom', C: 'Regular', D: 'Atenção', F: 'Crítico' }[grade]
  const gradeColor = { A: '#4ade80', B: '#60a5fa', C: '#fbbf24', D: '#fb923c', F: '#f87171' }[grade]

  return {
    total,
    grade,
    gradeLabel,
    gradeColor,
    dimensions: [
      { key: 'savings', label: 'Taxa de Poupança', score: savingsScore, max: 30, note: savingsNote, icon: '💰' },
      { key: 'budgets', label: 'Controle de Orçamentos', score: budgetScore, max: 25, note: budgetNote, icon: '📊' },
      { key: 'balance', label: 'Saúde do Balanço', score: balanceScore, max: 20, note: balanceNote, icon: '⚖️' },
      { key: 'planning', label: 'Planejamento', score: planningScore, max: 15, note: planningNote, icon: '🎯' },
      { key: 'flow', label: 'Fluxo Mensal', score: flowScore, max: 10, note: flowNote, icon: '📈' },
    ],
    // Raw values for tips
    savingRate,
    income,
    expenses,
    totalAssets,
    totalDebt,
    debtRatio,
    hasGoals,
    hasBudgets,
    hasRecurring,
  }
}

export function getImprovementTips(scoreData) {
  const tips = []
  const { dimensions, savingRate, hasGoals, hasBudgets, hasRecurring, debtRatio } = scoreData

  // Sorted by opportunity (max - score), pick top 3
  const sorted = [...dimensions].sort((a, b) => (b.max - b.score) - (a.max - a.score))

  for (const dim of sorted.slice(0, 3)) {
    if (dim.key === 'savings' && (savingRate === null || savingRate < 20)) {
      tips.push({ icon: '💡', text: 'Tente poupar pelo menos 20% da sua renda mensal. Automatize uma transferência para poupança no dia do salário.' })
    } else if (dim.key === 'budgets' && !hasBudgets) {
      tips.push({ icon: '📊', text: 'Crie orçamentos por categoria (Alimentação, Lazer, etc.) para visualizar onde seu dinheiro vai e controlar gastos.' })
    } else if (dim.key === 'balance' && debtRatio > 20) {
      tips.push({ icon: '💳', text: 'Priorize quitar o cartão de crédito antes de novos investimentos. Juros do rotativo são os mais caros do mercado.' })
    } else if (dim.key === 'planning' && !hasGoals) {
      tips.push({ icon: '🎯', text: 'Defina metas financeiras claras (reserva de emergência, viagem, etc.) para manter o foco e a motivação.' })
    } else if (dim.key === 'planning' && !hasRecurring) {
      tips.push({ icon: '🔁', text: 'Cadastre suas receitas e despesas fixas em Fluxo de Caixa para ver para onde seu dinheiro vai todo mês.' })
    } else if (dim.key === 'flow') {
      tips.push({ icon: '📉', text: 'Suas despesas mensais estão consumindo toda a renda. Identifique 2-3 categorias onde pode cortar sem impactar qualidade de vida.' })
    }
  }

  return tips.slice(0, 3)
}
