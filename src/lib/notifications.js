import { currentMonth, countsAsFlow } from './utils'

// Deterministic ID so read-state persists across renders
function nid(...parts) {
  return parts.join('::')
}

export function computeNotifications({ transactions, accounts, budgets, goals, recurringItems = [] }) {
  const notifications = []
  const month = currentMonth()

  // ── Budget alerts ──────────────────────────────────────────────────────────
  const activeBudgets = (budgets || []).filter((b) => b.is_active)
  for (const b of activeBudgets) {
    const spent = transactions
      .filter((t) => t.type === 'expense' && countsAsFlow(t) && t.category === b.category && t.date >= b.start_date)
      .reduce((s, t) => s + t.amount, 0)
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0

    if (pct >= 100) {
      notifications.push({
        id: nid('budget_over', b.id, month),
        type: 'budget_over',
        severity: 'danger',
        icon: '🚨',
        title: `Orçamento estourado: ${b.category}`,
        body: `Você gastou ${pct.toFixed(0)}% do orçamento de ${b.category} este mês.`,
        route: '/budgets',
      })
    } else if (pct >= 80) {
      notifications.push({
        id: nid('budget_warning', b.id, month),
        type: 'budget_warning',
        severity: 'warning',
        icon: '⚠️',
        title: `Orçamento quase no limite: ${b.category}`,
        body: `${pct.toFixed(0)}% do orçamento de ${b.category} utilizado.`,
        route: '/budgets',
      })
    }
  }

  // ── Goal milestones ────────────────────────────────────────────────────────
  for (const g of (goals || [])) {
    const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0
    if (pct >= 100) {
      notifications.push({
        id: nid('goal_done', g.id),
        type: 'goal_complete',
        severity: 'success',
        icon: '🎉',
        title: `Meta concluída: ${g.name}`,
        body: `Parabéns! Você atingiu sua meta de ${g.name}.`,
        route: '/goals',
      })
    } else if (pct >= 75) {
      notifications.push({
        id: nid('goal_75', g.id),
        type: 'goal_milestone',
        severity: 'info',
        icon: '🎯',
        title: `Meta 75% concluída: ${g.name}`,
        body: `Você já poupou 75% do valor alvo de ${g.name}. Continue assim!`,
        route: '/goals',
      })
    }
  }

  // ── Monthly cash flow ──────────────────────────────────────────────────────
  const income = transactions
    .filter((t) => t.type === 'income' && countsAsFlow(t) && t.date?.startsWith(month))
    .reduce((s, t) => s + (t.amount || 0), 0)
  const expenses = transactions
    .filter((t) => t.type === 'expense' && countsAsFlow(t) && t.date?.startsWith(month))
    .reduce((s, t) => s + (t.amount || 0), 0)

  if (income > 0 && expenses > income) {
    notifications.push({
      id: nid('neg_flow', month),
      type: 'negative_flow',
      severity: 'danger',
      icon: '📉',
      title: 'Despesas superam receitas',
      body: `Este mês suas despesas estão ${((expenses / income - 1) * 100).toFixed(0)}% acima das receitas.`,
      route: '/reports',
    })
  }

  // ── Low balance ────────────────────────────────────────────────────────────
  for (const a of (accounts || []).filter((a) => a.is_active && a.type !== 'credit_card')) {
    if (a.balance >= 0 && a.balance < 500) {
      notifications.push({
        id: nid('low_balance', a.id),
        type: 'low_balance',
        severity: 'warning',
        icon: '💸',
        title: `Saldo baixo: ${a.name}`,
        body: `Conta "${a.name}" está com saldo abaixo de R$ 500.`,
        route: '/accounts',
      })
    }
  }

  // ── Projection negative balance ────────────────────────────────────────────
  const activeRecurring = (recurringItems || []).filter((r) => r.is_active)
  if (activeRecurring.length > 0) {
    const monthlyNet = activeRecurring.reduce((s, r) => s + (r.type === 'income' ? r.amount : -r.amount), 0)
    if (monthlyNet < 0) {
      notifications.push({
        id: nid('proj_neg', 'recurring'),
        type: 'projection_negative',
        severity: 'warning',
        icon: '📅',
        title: 'Projeção de saldo negativo',
        body: 'Suas despesas fixas superam as receitas fixas. Revise o fluxo de caixa.',
        route: '/cashflow',
      })
    }
  }

  // Deduplicate by id (same id = same notification, keep first)
  const seen = new Set()
  return notifications.filter((n) => {
    if (seen.has(n.id)) return false
    seen.add(n.id)
    return true
  })
}
