import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { CalendarRange, Plus, Sparkles, Edit2, Trash2, AlertTriangle, X, CheckCircle2 } from 'lucide-react'
import { format, addMonths, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useHideValues } from '@/hooks/useHideValues'
import { useStore } from '@/store/useStore'
import { formatCurrency, countsAsFlow, DEFAULT_CATEGORIES } from '@/lib/utils'
import { cn } from '@/lib/utils'

function detectRecurring(transactions) {
  const months = [0, 1, 2].map((i) => format(addMonths(new Date(), -i), 'yyyy-MM'))
  const buckets = {}
  for (const t of transactions) {
    if (!countsAsFlow(t) || !t.date) continue
    const m = t.date.slice(0, 7)
    if (!months.includes(m)) continue
    const key = `${t.type}__${t.category || 'outros'}`
    if (!buckets[key]) buckets[key] = { type: t.type, category: t.category || 'outros', months: {}, amounts: [] }
    if (!buckets[key].months[m]) { buckets[key].months[m] = 0; buckets[key].amounts.push(0) }
    buckets[key].months[m] += t.amount
  }
  return Object.values(buckets)
    .filter((b) => Object.keys(b.months).length >= 2)
    .map((b) => ({
      type: b.type,
      category: b.category,
      amount: Object.values(b.months).reduce((s, v) => s + v, 0) / Object.keys(b.months).length,
    }))
    .sort((a, b) => b.amount - a.amount)
}

function buildProjection(recurringItems, months = 6) {
  const points = []
  const active = recurringItems.filter((r) => r.is_active)
  const monthlyIncome = active.filter((r) => r.type === 'income').reduce((s, r) => s + r.amount, 0)
  const monthlyExpense = active.filter((r) => r.type === 'expense').reduce((s, r) => s + r.amount, 0)
  let running = 0
  for (let i = 1; i <= months; i++) {
    running += monthlyIncome - monthlyExpense
    points.push({
      name: format(startOfMonth(addMonths(new Date(), i)), "MMM yy", { locale: ptBR }),
      balance: running,
    })
  }
  return { points, monthlyIncome, monthlyExpense, monthlyNet: monthlyIncome - monthlyExpense }
}

const CATEGORIES = DEFAULT_CATEGORIES.map((c) => c.name)
const EMPTY_FORM = { name: '', type: 'expense', category: 'Outros', amount: '' }

function RecurringForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.amount) return
    onSave({ name: form.name.trim(), type: form.type, category: form.category, amount: parseFloat(form.amount) || 0 })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-fg-muted mb-1.5 block">Nome</label>
          <input
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-fg/40 transition"
            placeholder="Ex: Salário, Aluguel"
            value={form.name} onChange={(e) => set('name', e.target.value)} required
          />
        </div>
        <div>
          <label className="text-xs text-fg-muted mb-1.5 block">Tipo</label>
          <select
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg focus:outline-none focus:ring-fg/40 transition"
            value={form.type} onChange={(e) => set('type', e.target.value)}
          >
            <option value="income">Receita</option>
            <option value="expense">Despesa</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-fg-muted mb-1.5 block">Valor (R$)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-fg/40 transition"
            placeholder="0"
            value={form.amount} onChange={(e) => set('amount', e.target.value)} required
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-fg-muted mb-1.5 block">Categoria</label>
          <select
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg focus:outline-none focus:ring-fg/40 transition"
            value={form.category} onChange={(e) => set('category', e.target.value)}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 bg-fg text-bg text-sm font-semibold py-2 rounded-btn hover:bg-fg/90 transition cursor-pointer">
          Salvar
        </button>
        <button type="button" onClick={onCancel} className="px-4 text-sm text-fg-muted bg-bg-elevated rounded-btn ring-1 ring-border hover:bg-bg-hover transition cursor-pointer">
          Cancelar
        </button>
      </div>
    </form>
  )
}

function ProjectionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-bg-overlay ring-1 ring-border rounded-card px-3 py-2 text-xs shadow-lg">
      <p className="text-fg-secondary mb-1">{label}</p>
      <span className={cn('font-semibold tabular-nums', v >= 0 ? 'text-success' : 'text-danger')}>{fmt(v)}</span>
    </div>
  )
}

export default function CashFlow() {
  const { transactions, recurringItems = [], addRecurringItem, updateRecurringItem, deleteRecurringItem } = useStore()
  const valuesHidden = useHideValues()
  const fmt = (v) => valuesHidden ? '•••••' : formatCurrency(v)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const candidates = useMemo(() => detectRecurring(transactions), [transactions])
  const confirmedKeys = useMemo(() => new Set(recurringItems.map((r) => `${r.type}__${r.category}`)), [recurringItems])
  const pendingCandidates = candidates.filter((c) => !confirmedKeys.has(`${c.type}__${c.category}`))

  const { points, monthlyIncome, monthlyExpense, monthlyNet } = useMemo(
    () => buildProjection(recurringItems),
    [recurringItems]
  )

  const hasNegative = points.some((p) => p.balance < 0)

  const incomeItems = recurringItems.filter((r) => r.type === 'income')
  const expenseItems = recurringItems.filter((r) => r.type === 'expense')

  const handleSave = (data) => {
    if (editItem) {
      updateRecurringItem(editItem.id, data)
      setEditItem(null)
    } else {
      addRecurringItem(data)
      setShowForm(false)
    }
  }

  const confirmCandidate = (c) => {
    addRecurringItem({ name: c.category, type: c.type, category: c.category, amount: Math.round(c.amount) })
  }

  return (
    <div className="p-5 lg:p-7 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <CalendarRange size={18} className="text-fg-secondary" />
          <h1 className="text-lg font-semibold text-fg">Fluxo de Caixa</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-fg text-bg text-xs font-semibold px-3.5 py-2 rounded-btn hover:bg-fg/90 transition cursor-pointer"
        >
          <Plus size={13} />
          Adicionar
        </button>
      </div>

      {/* Alert */}
      {hasNegative && (
        <div className="flex items-center gap-2.5 bg-danger-muted ring-1 ring-danger/30 rounded-card px-4 py-3 mb-5">
          <AlertTriangle size={14} className="text-danger shrink-0" />
          <p className="text-xs text-danger font-medium">Projeção indica saldo negativo nos próximos meses. Revise suas despesas fixas.</p>
        </div>
      )}

      {/* Auto-detected candidates */}
      {pendingCandidates.length > 0 && (
        <div className="bg-bg-surface rounded-card ring-1 ring-border p-4 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-violet" />
            <p className="text-xs font-semibold text-fg">Recorrências detectadas automaticamente</p>
          </div>
          <div className="flex flex-col gap-2">
            {pendingCandidates.slice(0, 5).map((c) => {
              const cat = DEFAULT_CATEGORIES.find((d) => d.name === c.category)
              return (
                <div key={`${c.type}__${c.category}`} className="flex items-center justify-between gap-3 py-1.5 border-b border-border-subtle last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat?.icon || '📦'}</span>
                    <div>
                      <p className="text-xs font-medium text-fg">{c.category}</p>
                      <p className="text-2xs text-fg-muted">{c.type === 'income' ? 'Receita' : 'Despesa'} · {fmt(c.amount)}/mês</p>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmCandidate(c)}
                    className="flex items-center gap-1 text-2xs font-semibold text-success bg-success-muted ring-1 ring-success/20 px-2.5 py-1 rounded-btn hover:bg-success/20 transition cursor-pointer"
                  >
                    <CheckCircle2 size={11} />
                    Confirmar
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {(showForm || editItem) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-bg-surface rounded-card ring-1 ring-border p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-fg">{editItem ? 'Editar item' : 'Novo item recorrente'}</p>
                <button onClick={() => { setShowForm(false); setEditItem(null) }} className="p-1 text-fg-muted hover:text-fg cursor-pointer"><X size={14} /></button>
              </div>
              <RecurringForm
                initial={editItem ? { name: editItem.name, type: editItem.type, category: editItem.category, amount: String(editItem.amount) } : EMPTY_FORM}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditItem(null) }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary + Chart */}
      {recurringItems.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Receitas Fixas', value: monthlyIncome, color: 'text-success' },
              { label: 'Despesas Fixas', value: monthlyExpense, color: 'text-danger' },
              { label: 'Saldo Mensal', value: monthlyNet, color: monthlyNet >= 0 ? 'text-success' : 'text-danger' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-bg-surface rounded-card ring-1 ring-border p-4">
                <p className="text-2xs text-fg-muted mb-1">{label}</p>
                <p className={cn('text-base font-bold tabular-nums', color)}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          <div className="bg-bg-surface rounded-card ring-1 ring-border p-5 mb-5">
            <p className="text-xs font-semibold text-fg mb-4">Projeção de Saldo — próximos 6 meses</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={points} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} width={50} />
                <Tooltip content={<ProjectionTooltip />} />
                {hasNegative && <ReferenceLine y={0} stroke="#f87171" strokeDasharray="4 2" strokeWidth={1} />}
                <Area type="monotone" dataKey="balance" stroke="#60a5fa" strokeWidth={1.5} fill="url(#cfGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: 'Receitas Recorrentes', items: incomeItems, type: 'income' },
          { label: 'Despesas Recorrentes', items: expenseItems, type: 'expense' },
        ].map(({ label, items, type }) => (
          <div key={type} className="bg-bg-surface rounded-card ring-1 ring-border p-4">
            <p className="text-xs font-semibold text-fg mb-3">{label}</p>
            {items.length === 0 ? (
              <p className="text-xs text-fg-muted py-4 text-center">Nenhum item</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                <AnimatePresence>
                  {items.map((item) => {
                    const cat = DEFAULT_CATEGORIES.find((c) => c.name === item.category)
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-3 py-2.5 border-b border-border-subtle last:border-0"
                      >
                        <button
                          onClick={() => updateRecurringItem(item.id, { is_active: !item.is_active })}
                          className={cn('w-4 h-4 rounded border shrink-0 flex items-center justify-center cursor-pointer transition-colors',
                            item.is_active ? 'bg-fg border-fg' : 'border-border-strong bg-bg-elevated'
                          )}
                        >
                          {item.is_active && <CheckCircle2 size={10} className="text-bg" />}
                        </button>
                        <span className="text-sm shrink-0">{cat?.icon || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-medium truncate', item.is_active ? 'text-fg' : 'text-fg-muted line-through')}>{item.name}</p>
                          <p className="text-2xs text-fg-muted">{item.category}</p>
                        </div>
                        <p className={cn('text-xs font-semibold tabular-nums shrink-0', type === 'income' ? 'text-success' : 'text-danger')}>
                          {fmt(item.amount)}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setEditItem(item)} className="p-1 text-fg-muted hover:text-fg cursor-pointer"><Edit2 size={12} /></button>
                          <button onClick={() => deleteRecurringItem(item.id)} className="p-1 text-fg-muted hover:text-danger cursor-pointer"><Trash2 size={12} /></button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        ))}
      </div>

      {recurringItems.length === 0 && pendingCandidates.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 mt-4">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center text-3xl">📅</div>
          <div className="text-center">
            <p className="text-sm font-medium text-fg mb-1">Sem itens recorrentes</p>
            <p className="text-xs text-fg-muted max-w-xs">Adicione suas receitas e despesas fixas para ver uma projeção dos próximos meses.</p>
          </div>
        </div>
      )}
    </div>
  )
}
