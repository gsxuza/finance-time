import { useMemo, useState } from 'react'
import { format, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Plus, Edit2, Trash2, Check, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { formatCurrency, countsAsFlow, DEFAULT_CATEGORIES } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'

// ─── Detection algorithm ─────────────────────────────────────────────────────
// Looks at the last 3 months of transactions and finds (type + category) pairs
// that appear in at least 2 months. Returns candidate recurring items with
// average monthly amount.
function detectRecurring(transactions) {
  const now = new Date()
  const months = [0, 1, 2].map((i) => format(addMonths(now, -i - 1), 'yyyy-MM'))

  // Map: key → { type, category, amounts per month }
  const map = {}
  for (const t of transactions) {
    if (!countsAsFlow(t)) continue
    const m = t.date?.slice(0, 7)
    if (!months.includes(m)) continue
    const key = `${t.type}__${t.category}`
    if (!map[key]) map[key] = { type: t.type, category: t.category, byMonth: {} }
    map[key].byMonth[m] = (map[key].byMonth[m] || 0) + (t.amount || 0)
  }

  const candidates = []
  for (const [, item] of Object.entries(map)) {
    const monthAmounts = Object.values(item.byMonth)
    if (monthAmounts.length < 2) continue
    const avg = monthAmounts.reduce((s, v) => s + v, 0) / monthAmounts.length
    if (avg < 5) continue // ignore trivially small amounts
    candidates.push({
      type: item.type,
      category: item.category,
      amount: Math.round(avg * 100) / 100,
      months_found: monthAmounts.length,
    })
  }

  return candidates.sort((a, b) => b.amount - a.amount)
}

// ─── Projection engine ────────────────────────────────────────────────────────
function buildProjection(currentBalance, recurringItems, months = 6) {
  const activeIncome = recurringItems.filter((r) => r.is_active && r.type === 'income')
  const activeExpense = recurringItems.filter((r) => r.is_active && r.type === 'expense')
  const monthlyIncome = activeIncome.reduce((s, r) => s + (r.amount || 0), 0)
  const monthlyExpense = activeExpense.reduce((s, r) => s + (r.amount || 0), 0)

  const points = []
  let balance = currentBalance
  for (let i = 0; i <= months; i++) {
    const date = addMonths(new Date(), i)
    points.push({
      name: i === 0 ? 'Hoje' : format(date, 'MMM/yy', { locale: ptBR }),
      balance: Math.round(balance * 100) / 100,
      income: i === 0 ? 0 : monthlyIncome,
      expense: i === 0 ? 0 : monthlyExpense,
    })
    balance += monthlyIncome - monthlyExpense
  }
  return { points, monthlyIncome, monthlyExpense, monthlyNet: monthlyIncome - monthlyExpense }
}

// ─── Form ─────────────────────────────────────────────────────────────────────
function RecurringForm({ onClose, initial }) {
  const { addRecurringItem, updateRecurringItem } = useStore()
  const [form, setForm] = useState(initial || {
    name: '', type: 'expense', category: 'Outros', amount: '', is_active: true,
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, amount: parseFloat(form.amount) || 0, auto_detected: false }
    if (initial) updateRecurringItem(initial.id, data)
    else addRecurringItem(data)
    onClose()
  }

  const cats = DEFAULT_CATEGORIES.filter((c) => c.type === form.type)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nome" required placeholder="Ex: Salário, Netflix, Aluguel" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Tipo" value={form.type} onChange={(e) => { set('type', e.target.value); set('category', e.target.value === 'income' ? 'Salário' : 'Outros') }}>
          <option value="income">Receita</option>
          <option value="expense">Despesa</option>
        </Select>
        <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
          {cats.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
        </Select>
      </div>
      <Input label="Valor mensal (R$)" type="number" step="0.01" min="0.01" required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">{initial ? 'Salvar' : 'Adicionar'}</Button>
      </div>
    </form>
  )
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ProjectionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="bg-bg-elevated ring-1 ring-border rounded-card px-3 py-2 text-xs shadow-card">
      <p className="text-fg-secondary font-medium mb-1">{label}</p>
      <p className={`font-bold tabular-nums ${d.balance >= 0 ? 'text-fg' : 'text-danger'}`}>{formatCurrency(d.balance)}</p>
      {d.income > 0 && <p className="text-success tabular-nums">+{formatCurrency(d.income)}</p>}
      {d.expense > 0 && <p className="text-danger tabular-nums">−{formatCurrency(d.expense)}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CashFlow() {
  const { transactions, recurringItems = [], addRecurringItem, updateRecurringItem, deleteRecurringItem, getTotalBalance } = useStore()
  const [modal, setModal] = useState(null)
  const [showDetected, setShowDetected] = useState(true)

  const currentBalance = getTotalBalance()

  // Auto-detected candidates not yet in the store
  const candidates = useMemo(() => {
    const detected = detectRecurring(transactions)
    const confirmed = new Set(recurringItems.filter((r) => r.auto_detected).map((r) => `${r.type}__${r.category}`))
    const manual = new Set(recurringItems.filter((r) => !r.auto_detected).map((r) => `${r.type}__${r.category}`))
    return detected.filter((c) => {
      const key = `${c.type}__${c.category}`
      return !confirmed.has(key) && !manual.has(key)
    })
  }, [transactions, recurringItems])

  const { points, monthlyIncome, monthlyExpense, monthlyNet } = useMemo(
    () => buildProjection(currentBalance, recurringItems),
    [currentBalance, recurringItems]
  )

  // Find first month where balance goes negative
  const negativeAt = points.find((p, i) => i > 0 && p.balance < 0)

  const confirmCandidate = (c) => {
    const cat = DEFAULT_CATEGORIES.find((x) => x.name === c.category)
    addRecurringItem({
      name: cat ? `${cat.icon} ${c.category}` : c.category,
      type: c.type,
      category: c.category,
      amount: c.amount,
      is_active: true,
      auto_detected: true,
      confirmed: true,
    })
  }

  const incomeItems = recurringItems.filter((r) => r.type === 'income')
  const expenseItems = recurringItems.filter((r) => r.type === 'expense')

  const chartMin = Math.min(...points.map((p) => p.balance))
  const chartMax = Math.max(...points.map((p) => p.balance))
  const areaColor = monthlyNet >= 0 ? '#4ade80' : '#f87171'

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-fg">Fluxo de Caixa</h1>
          <p className="text-2xs text-fg-muted mt-0.5">Projeção dos próximos 6 meses</p>
        </div>
        <Button onClick={() => setModal('new')} size="sm"><Plus size={16} /> Recorrência</Button>
      </div>

      {/* Alert */}
      {negativeAt && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 bg-danger-muted ring-1 ring-danger/30 rounded-card p-4 mb-5"
        >
          <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger">Saldo projetado negativo</p>
            <p className="text-xs text-fg-muted mt-0.5">
              Com o padrão atual, seu saldo ficará negativo em <span className="text-fg font-medium">{negativeAt.name}</span>{' '}
              ({formatCurrency(negativeAt.balance)}). Revise suas despesas recorrentes.
            </p>
          </div>
        </motion.div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-bg-surface ring-1 ring-border rounded-card p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={12} className="text-success" />
            <p className="text-2xs text-fg-muted font-medium">Receitas/mês</p>
          </div>
          <p className="text-base font-bold text-success tabular-nums">{formatCurrency(monthlyIncome)}</p>
        </div>
        <div className="bg-bg-surface ring-1 ring-border rounded-card p-3.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown size={12} className="text-danger" />
            <p className="text-2xs text-fg-muted font-medium">Despesas/mês</p>
          </div>
          <p className="text-base font-bold text-danger tabular-nums">{formatCurrency(monthlyExpense)}</p>
        </div>
        <div className="bg-bg-surface ring-1 ring-border rounded-card p-3.5">
          <p className="text-2xs text-fg-muted font-medium mb-1.5">Resultado/mês</p>
          <p className={`text-base font-bold tabular-nums ${monthlyNet >= 0 ? 'text-success' : 'text-danger'}`}>
            {monthlyNet >= 0 ? '+' : ''}{formatCurrency(monthlyNet)}
          </p>
        </div>
      </div>

      {/* Projection chart */}
      <Card className="mb-5">
        <CardHeader><CardTitle>Projeção de saldo</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {recurringItems.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-fg-muted">
              Adicione receitas e despesas recorrentes para ver a projeção
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={areaColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={areaColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#555555' }} axisLine={false} tickLine={false} />
                <YAxis hide domain={[Math.min(0, chartMin * 1.1), chartMax * 1.1]} />
                {chartMin < 0 && <ReferenceLine y={0} stroke="#f87171" strokeDasharray="3 3" strokeOpacity={0.5} />}
                <Tooltip content={<ProjectionTooltip />} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke={areaColor}
                  strokeWidth={2}
                  fill="url(#balanceGrad)"
                  dot={{ fill: areaColor, r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: areaColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Auto-detected candidates */}
      {showDetected && candidates.length > 0 && (
        <motion.div layout className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-violet" />
              <p className="text-xs font-medium text-fg-secondary">Detectadas automaticamente</p>
              <span className="text-2xs bg-violet-muted text-violet px-1.5 py-0.5 rounded-badge ring-1 ring-violet/20">{candidates.length}</span>
            </div>
            <button onClick={() => setShowDetected(false)} className="text-fg-muted hover:text-fg transition-colors cursor-pointer"><X size={13} /></button>
          </div>
          <div className="bg-bg-surface ring-1 ring-border rounded-card divide-y divide-border-subtle overflow-hidden">
            {candidates.map((c) => {
              const cat = DEFAULT_CATEGORIES.find((x) => x.name === c.category)
              return (
                <div key={`${c.type}__${c.category}`} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-base">{cat?.icon || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-fg truncate">{c.category}</p>
                    <p className="text-2xs text-fg-muted">{c.type === 'income' ? 'Receita' : 'Despesa'} · encontrada em {c.months_found} meses</p>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${c.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {c.type === 'income' ? '+' : '−'}{formatCurrency(c.amount)}/mês
                  </span>
                  <button
                    onClick={() => confirmCandidate(c)}
                    className="flex items-center gap-1 text-2xs font-medium px-2.5 py-1.5 rounded-btn bg-success/10 text-success ring-1 ring-success/20 hover:bg-success/20 transition-colors cursor-pointer shrink-0"
                  >
                    <Check size={11} /> Confirmar
                  </button>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Recurring items list */}
      {[{ label: 'Receitas recorrentes', items: incomeItems, colorClass: 'text-success' }, { label: 'Despesas recorrentes', items: expenseItems, colorClass: 'text-danger' }].map(({ label, items, colorClass }) => (
        <div key={label} className="mb-4">
          <p className="text-xs font-medium text-fg-secondary mb-2">{label}</p>
          {items.length === 0 ? (
            <div className="bg-bg-surface ring-1 ring-border rounded-card px-4 py-3 text-xs text-fg-muted">
              Nenhuma {label.toLowerCase()} cadastrada
            </div>
          ) : (
            <div className="bg-bg-surface ring-1 ring-border rounded-card divide-y divide-border-subtle overflow-hidden">
              <AnimatePresence>
                {items.map((r) => {
                  const cat = DEFAULT_CATEGORIES.find((x) => x.name === r.category)
                  return (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <button
                        onClick={() => updateRecurringItem(r.id, { is_active: !r.is_active })}
                        className={`w-4 h-4 rounded ring-1 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${r.is_active ? 'bg-fg ring-fg' : 'bg-transparent ring-border'}`}
                      >
                        {r.is_active && <Check size={10} className="text-bg" strokeWidth={3} />}
                      </button>
                      <span className="text-sm">{cat?.icon || '📦'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${r.is_active ? 'text-fg' : 'text-fg-muted line-through'}`}>{r.name}</p>
                        <p className="text-2xs text-fg-muted">{r.category}{r.auto_detected ? ' · detectada' : ''}</p>
                      </div>
                      <span className={`text-xs font-semibold tabular-nums ${r.is_active ? colorClass : 'text-fg-muted'}`}>
                        {formatCurrency(r.amount)}/mês
                      </span>
                      <div className="flex gap-0.5 shrink-0">
                        <button onClick={() => setModal(r)} className="p-1.5 rounded-btn hover:bg-bg-hover text-fg-muted hover:text-fg cursor-pointer transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => deleteRecurringItem(r.id)} className="p-1.5 rounded-btn hover:bg-danger-muted text-fg-muted hover:text-danger cursor-pointer transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      ))}

      {recurringItems.length === 0 && candidates.length === 0 && (
        <div className="text-center py-16 text-fg-muted">
          <TrendingUp size={36} className="mx-auto mb-3 text-fg-disabled" />
          <p className="text-sm font-medium text-fg-secondary">Nenhuma recorrência cadastrada</p>
          <p className="text-xs mt-1 mb-5">Adicione suas receitas e despesas fixas para ver a projeção</p>
          <Button onClick={() => setModal('new')}><Plus size={16} /> Adicionar recorrência</Button>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nova Recorrência' : 'Editar Recorrência'} size="sm">
        <RecurringForm onClose={() => setModal(null)} initial={modal === 'new' ? null : modal} />
      </Modal>
    </div>
  )
}
