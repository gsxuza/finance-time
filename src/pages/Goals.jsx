import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, CheckCircle2, Trash2, PiggyBank, TrendingUp, Clock, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'

const ICONS = ['🎯', '🏠', '🚗', '✈️', '📚', '💍', '🏖️', '💻', '🐾', '💡', '🏋️', '🎓', '🛡️', '🌱', '💎']
const COLORS = [
  { id: 'blue', label: 'Azul', value: '#60a5fa' },
  { id: 'violet', label: 'Violeta', value: '#a78bfa' },
  { id: 'green', label: 'Verde', value: '#4ade80' },
  { id: 'amber', label: 'Âmbar', value: '#fbbf24' },
  { id: 'rose', label: 'Rosa', value: '#f472b6' },
  { id: 'cyan', label: 'Ciano', value: '#22d3ee' },
  { id: 'orange', label: 'Laranja', value: '#fb923c' },
  { id: 'teal', label: 'Verde-azul', value: '#2dd4bf' },
  { id: 'indigo', label: 'Índigo', value: '#818cf8' },
  { id: 'lime', label: 'Lima', value: '#a3e635' },
]

const EMPTY_FORM = { name: '', icon: '🎯', target_amount: '', current_amount: '', deadline: '', color: '#60a5fa' }

function GoalForm({ initial = EMPTY_FORM, onSave, onCancel }) {
  const [form, setForm] = useState(initial)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.target_amount) return
    onSave({
      name: form.name.trim(),
      icon: form.icon,
      target_amount: parseFloat(form.target_amount) || 0,
      current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || null,
      color: form.color,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Icon picker */}
      <div>
        <label className="text-xs text-fg-muted mb-2 block">Ícone</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((ic) => (
            <button
              key={ic} type="button"
              onClick={() => set('icon', ic)}
              className={cn('w-9 h-9 rounded-btn text-lg flex items-center justify-center transition-all cursor-pointer', form.icon === ic ? 'ring-2 ring-fg bg-bg-elevated' : 'bg-bg-elevated hover:bg-bg-hover')}
            >{ic}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-fg-muted mb-1.5 block">Nome da Meta</label>
          <input
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-fg/40 transition"
            placeholder="Ex: Reserva de emergência"
            value={form.name} onChange={(e) => set('name', e.target.value)} required
          />
        </div>
        <div>
          <label className="text-xs text-fg-muted mb-1.5 block">Valor Alvo (R$)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-fg/40 transition"
            placeholder="10000"
            value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)} required
          />
        </div>
        <div>
          <label className="text-xs text-fg-muted mb-1.5 block">Valor Atual (R$)</label>
          <input
            type="number" min="0" step="0.01"
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-fg/40 transition"
            placeholder="0"
            value={form.current_amount} onChange={(e) => set('current_amount', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-fg-muted mb-1.5 block">Prazo (opcional)</label>
          <input
            type="date"
            className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-fg/40 transition"
            value={form.deadline || ''} onChange={(e) => set('deadline', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-fg-muted mb-1.5 block">Cor</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id} type="button"
                onClick={() => set('color', c.value)}
                title={c.label}
                className={cn('w-6 h-6 rounded-full transition-all cursor-pointer', form.color === c.value ? 'ring-2 ring-offset-2 ring-offset-bg-elevated ring-fg/60 scale-110' : 'hover:scale-105')}
                style={{ background: c.value }}
              />
            ))}
          </div>
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

function DepositModal({ goal, onClose }) {
  const updateGoal = useStore((s) => s.updateGoal)
  const [amount, setAmount] = useState('')

  const handleDeposit = (e) => {
    e.preventDefault()
    const v = parseFloat(amount)
    if (!v || v <= 0) return
    updateGoal(goal.id, { current_amount: goal.current_amount + v })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-surface rounded-card ring-1 ring-border p-6 w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{goal.icon}</span>
          <div>
            <p className="text-sm font-semibold text-fg">{goal.name}</p>
            <p className="text-xs text-fg-muted">{formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}</p>
          </div>
        </div>
        <form onSubmit={handleDeposit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-fg-muted mb-1.5 block">Valor a depositar (R$)</label>
            <input
              type="number" min="0.01" step="0.01" autoFocus
              className="w-full bg-bg-elevated ring-1 ring-border rounded-btn px-3 py-2 text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-fg/40 transition"
              placeholder="100"
              value={amount} onChange={(e) => setAmount(e.target.value)} required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-fg text-bg text-sm font-semibold py-2 rounded-btn hover:bg-fg/90 transition cursor-pointer">
              Depositar
            </button>
            <button type="button" onClick={onClose} className="px-4 text-sm text-fg-muted bg-bg-elevated rounded-btn ring-1 ring-border hover:bg-bg-hover transition cursor-pointer">
              Cancelar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function GoalCard({ goal, onDeposit }) {
  const deleteGoal = useStore((s) => s.deleteGoal)
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
  const done = pct >= 100
  const remaining = Math.max(0, goal.target_amount - goal.current_amount)

  const daysLeft = goal.deadline ? Math.ceil((new Date(goal.deadline + 'T00:00:00') - new Date()) / 86400000) : null
  const monthsLeft = daysLeft != null ? Math.max(1, Math.ceil(daysLeft / 30)) : null
  const monthlyNeeded = monthsLeft && remaining > 0 ? remaining / monthsLeft : null

  const urgencyColor = daysLeft == null ? 'text-fg-muted' : daysLeft < 0 ? 'text-danger' : daysLeft < 30 ? 'text-warning' : 'text-fg-muted'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
      className="bg-bg-surface rounded-card ring-1 ring-border p-5 flex flex-col gap-4 relative group"
    >
      <button
        onClick={() => deleteGoal(goal.id)}
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1 rounded text-fg-muted hover:text-danger transition-all cursor-pointer"
      >
        <Trash2 size={13} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-btn flex items-center justify-center text-xl shrink-0" style={{ background: goal.color + '22' }}>
          {goal.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-fg truncate">{goal.name}</p>
            {done && <CheckCircle2 size={14} className="text-success shrink-0" />}
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            {formatCurrency(goal.current_amount)} <span className="text-fg-muted/50">/</span> {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold tabular-nums" style={{ color: done ? '#4ade80' : goal.color }}>
            {pct.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: done ? '#4ade80' : goal.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6, delay: 0.1 }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {daysLeft != null && (
            <div className="flex items-center gap-1">
              <Clock size={11} className={urgencyColor} />
              <span className={cn('text-2xs', urgencyColor)}>
                {daysLeft < 0 ? 'Vencida' : daysLeft === 0 ? 'Hoje' : `${daysLeft}d`}
              </span>
            </div>
          )}
          {monthlyNeeded && !done && (
            <div className="flex items-center gap-1">
              <TrendingUp size={11} className="text-fg-muted" />
              <span className="text-2xs text-fg-muted">{formatCurrency(monthlyNeeded)}/mês</span>
            </div>
          )}
        </div>
        {!done && (
          <button
            onClick={() => onDeposit(goal)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-btn ring-1 ring-border bg-bg-elevated hover:bg-bg-hover text-fg-secondary hover:text-fg transition cursor-pointer"
          >
            <Plus size={11} />
            Depositar
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function Goals() {
  const goals = useStore((s) => s.goals || [])
  const addGoal = useStore((s) => s.addGoal)
  const [showForm, setShowForm] = useState(false)
  const [depositGoal, setDepositGoal] = useState(null)

  const sorted = useMemo(() => {
    const active = goals.filter((g) => g.current_amount < g.target_amount)
    const done = goals.filter((g) => g.current_amount >= g.target_amount)
    active.sort((a, b) => (b.current_amount / b.target_amount) - (a.current_amount / a.target_amount))
    return [...active, ...done]
  }, [goals])

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
  const completedCount = goals.filter((g) => g.current_amount >= g.target_amount).length

  const handleSave = (data) => {
    addGoal(data)
    setShowForm(false)
  }

  return (
    <div className="p-5 lg:p-7 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Target size={18} className="text-fg-secondary" />
          <h1 className="text-lg font-semibold text-fg">Metas Financeiras</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-fg text-bg text-xs font-semibold px-3.5 py-2 rounded-btn hover:bg-fg/90 transition cursor-pointer"
        >
          <Plus size={13} />
          Nova Meta
        </button>
      </div>

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Poupado', value: formatCurrency(totalSaved), icon: PiggyBank },
            { label: 'Total Alvo', value: formatCurrency(totalTarget), icon: Target },
            { label: 'Concluídas', value: `${completedCount} / ${goals.length}`, icon: CheckCircle2 },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-bg-surface rounded-card ring-1 ring-border p-4">
              <p className="text-2xs text-fg-muted mb-1">{label}</p>
              <p className="text-base font-bold text-fg tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            className="overflow-hidden mb-5"
          >
            <div className="bg-bg-surface rounded-card ring-1 ring-border p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-fg">Nova Meta</p>
                <button onClick={() => setShowForm(false)} className="p-1 text-fg-muted hover:text-fg cursor-pointer"><X size={14} /></button>
              </div>
              <GoalForm onSave={handleSave} onCancel={() => setShowForm(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal cards */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-bg-elevated flex items-center justify-center text-3xl">🎯</div>
          <div className="text-center">
            <p className="text-sm font-medium text-fg mb-1">Nenhuma meta criada</p>
            <p className="text-xs text-fg-muted max-w-xs">Defina objetivos financeiros para manter o foco e a motivação.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-btn ring-1 ring-border bg-bg-elevated hover:bg-bg-hover text-fg-secondary hover:text-fg transition cursor-pointer"
          >
            <Plus size={14} />
            Criar primeira meta
          </button>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence>
            {sorted.map((g) => (
              <GoalCard key={g.id} goal={g} onDeposit={setDepositGoal} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Deposit modal */}
      <AnimatePresence>
        {depositGoal && <DepositModal goal={depositGoal} onClose={() => setDepositGoal(null)} />}
      </AnimatePresence>
    </div>
  )
}
