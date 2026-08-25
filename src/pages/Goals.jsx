import { useState, useMemo } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Edit2, Trash2, Target, CheckCircle2, PlusCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'

const GOAL_ICONS = ['🎯', '🏖️', '🏠', '🚗', '📱', '✈️', '🎓', '💍', '🏋️', '🐶', '🎸', '💻', '🛟', '💰', '🏦']
const GOAL_COLORS = ['#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#34d399', '#f87171', '#06b6d4', '#fb923c', '#a3e635']

function GoalForm({ onClose, initial }) {
  const { addGoal, updateGoal } = useStore()
  const [form, setForm] = useState(initial || {
    name: '',
    icon: '🎯',
    target_amount: '',
    current_amount: '',
    deadline: '',
    color: '#4ade80',
    notes: '',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = {
      ...form,
      target_amount: parseFloat(form.target_amount) || 0,
      current_amount: parseFloat(form.current_amount) || 0,
    }
    if (initial) updateGoal(initial.id, data)
    else addGoal(data)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Icon picker */}
      <div>
        <label className="text-xs font-medium text-fg-secondary mb-2 block">Ícone</label>
        <div className="flex flex-wrap gap-1.5">
          {GOAL_ICONS.map((ic) => (
            <button
              type="button"
              key={ic}
              onClick={() => set('icon', ic)}
              className={`w-9 h-9 rounded-btn text-lg flex items-center justify-center transition-all cursor-pointer ${form.icon === ic ? 'bg-bg-hover ring-1 ring-border-strong scale-110' : 'bg-bg-elevated hover:bg-bg-hover'}`}
            >
              {ic}
            </button>
          ))}
        </div>
      </div>

      <Input label="Nome da meta" required placeholder="Ex: Reserva de emergência" value={form.name} onChange={(e) => set('name', e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Valor alvo (R$)" type="number" step="0.01" required min="1" value={form.target_amount} onChange={(e) => set('target_amount', e.target.value)} />
        <Input label="Valor atual (R$)" type="number" step="0.01" min="0" value={form.current_amount} onChange={(e) => set('current_amount', e.target.value)} />
      </div>

      <Input label="Prazo" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />

      {/* Color picker */}
      <div>
        <label className="text-xs font-medium text-fg-secondary mb-2 block">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {GOAL_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${form.color === c ? 'border-fg scale-110' : 'border-transparent opacity-50 hover:opacity-100'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">{initial ? 'Salvar' : 'Criar meta'}</Button>
      </div>
    </form>
  )
}

function DepositModal({ goal, onClose }) {
  const { updateGoal } = useStore()
  const [amount, setAmount] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    updateGoal(goal.id, { current_amount: goal.current_amount + val })
    onClose()
  }

  const remaining = goal.target_amount - goal.current_amount

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="bg-bg-elevated rounded-card p-4 flex items-center gap-3">
        <span className="text-2xl">{goal.icon}</span>
        <div>
          <p className="text-sm font-medium text-fg">{goal.name}</p>
          <p className="text-xs text-fg-muted">Faltam {formatCurrency(Math.max(0, remaining))}</p>
        </div>
      </div>
      <Input
        label="Valor a depositar (R$)"
        type="number"
        step="0.01"
        min="0.01"
        required
        autoFocus
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0,00"
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="success" className="flex-1">Depositar</Button>
      </div>
    </form>
  )
}

function GoalCard({ goal, onEdit, onDelete, onDeposit }) {
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.current_amount / goal.target_amount) * 100) : 0
  const remaining = goal.target_amount - goal.current_amount
  const done = pct >= 100

  const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null
  const monthsLeft = daysLeft !== null ? Math.max(1, Math.ceil(daysLeft / 30)) : null
  const monthlyNeeded = monthsLeft && remaining > 0 ? remaining / monthsLeft : 0

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
      <Card>
        <CardContent className="pt-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-btn bg-bg-elevated flex items-center justify-center text-xl shrink-0">
                {goal.icon}
              </div>
              <div>
                <p className="font-medium text-fg text-sm">{goal.name}</p>
                {goal.deadline && (
                  <p className={`text-2xs mt-0.5 ${daysLeft !== null && daysLeft < 0 ? 'text-danger' : daysLeft !== null && daysLeft < 30 ? 'text-warning' : 'text-fg-muted'}`}>
                    {daysLeft !== null && daysLeft < 0
                      ? 'Prazo encerrado'
                      : daysLeft === 0
                      ? 'Vence hoje'
                      : `${daysLeft}d restantes · ${format(parseISO(goal.deadline), 'MMM yyyy', { locale: ptBR })}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1 items-center">
              {done && <CheckCircle2 size={14} className="text-success mr-0.5" />}
              <button onClick={onEdit} className="p-1.5 rounded-btn hover:bg-bg-hover text-fg-muted hover:text-fg cursor-pointer transition-colors"><Edit2 size={13} /></button>
              <button onClick={onDelete} className="p-1.5 rounded-btn hover:bg-danger-muted text-fg-muted hover:text-danger cursor-pointer transition-colors"><Trash2 size={13} /></button>
            </div>
          </div>

          {/* Values */}
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xs text-fg-muted mb-0.5">Acumulado</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: done ? '#4ade80' : goal.color }}>
                {formatCurrency(goal.current_amount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xs text-fg-muted mb-0.5">Meta</p>
              <p className="text-sm font-semibold text-fg-secondary tabular-nums">{formatCurrency(goal.target_amount)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="h-full rounded-full"
              style={{ background: done ? '#4ade80' : goal.color }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-2xs font-medium px-2 py-0.5 rounded-badge ring-1 ${done ? 'text-success bg-success-muted ring-success/20' : 'text-fg-muted bg-bg-elevated ring-border'}`}>
                {pct.toFixed(0)}%
              </span>
              {!done && monthlyNeeded > 0 && (
                <span className="text-2xs text-fg-muted">{formatCurrency(monthlyNeeded)}/mês</span>
              )}
            </div>
            {!done && (
              <button
                onClick={onDeposit}
                className="flex items-center gap-1 text-2xs font-medium px-2.5 py-1.5 rounded-btn bg-bg-elevated hover:bg-bg-hover text-fg-secondary hover:text-fg ring-1 ring-border transition-all cursor-pointer"
              >
                <PlusCircle size={11} /> Depositar
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function Goals() {
  const { goals, deleteGoal } = useStore()
  const [modal, setModal] = useState(null) // null | 'new' | goal obj | { deposit: goal }
  const [depositGoal, setDepositGoal] = useState(null)

  const sorted = useMemo(() => {
    return [...goals].sort((a, b) => {
      const pctA = a.target_amount > 0 ? a.current_amount / a.target_amount : 0
      const pctB = b.target_amount > 0 ? b.current_amount / b.target_amount : 0
      // Completed goals go to the end
      if (pctA >= 1 && pctB < 1) return 1
      if (pctB >= 1 && pctA < 1) return -1
      return pctB - pctA
    })
  }, [goals])

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
  const completed = goals.filter((g) => g.target_amount > 0 && g.current_amount >= g.target_amount).length

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-fg">Metas</h1>
        <Button onClick={() => setModal('new')} size="sm"><Plus size={16} /> Nova meta</Button>
      </div>

      {/* Summary strip */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-bg-surface ring-1 ring-border rounded-card p-3.5">
            <p className="text-2xs text-fg-muted font-medium mb-1">Acumulado</p>
            <p className="text-base font-bold text-fg tabular-nums">{formatCurrency(totalSaved)}</p>
          </div>
          <div className="bg-bg-surface ring-1 ring-border rounded-card p-3.5">
            <p className="text-2xs text-fg-muted font-medium mb-1">Total de metas</p>
            <p className="text-base font-bold text-fg tabular-nums">{formatCurrency(totalTarget)}</p>
          </div>
          <div className="bg-bg-surface ring-1 ring-border rounded-card p-3.5">
            <p className="text-2xs text-fg-muted font-medium mb-1">Concluídas</p>
            <p className="text-base font-bold text-success tabular-nums">{completed}/{goals.length}</p>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-24 text-fg-muted">
          <Target size={40} className="mx-auto mb-4 text-fg-disabled" />
          <p className="text-sm font-medium text-fg-secondary">Nenhuma meta criada</p>
          <p className="text-xs mt-1 mb-5">Defina objetivos financeiros e acompanhe seu progresso</p>
          <Button onClick={() => setModal('new')}><Plus size={16} /> Criar primeira meta</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence>
            {sorted.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={() => setModal(goal)}
                onDelete={() => deleteGoal(goal.id)}
                onDeposit={() => setDepositGoal(goal)}
              />
            ))}
          </AnimatePresence>

          <motion.button
            layout
            onClick={() => setModal('new')}
            className="border border-dashed border-border rounded-card p-5 flex flex-col items-center justify-center gap-2 text-fg-muted hover:text-fg hover:border-border-strong hover:bg-bg-elevated transition-all cursor-pointer min-h-[200px]"
          >
            <Plus size={24} />
            <span className="text-sm font-medium">Nova meta</span>
          </motion.button>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nova Meta' : 'Editar Meta'}>
        <GoalForm onClose={() => setModal(null)} initial={modal === 'new' ? null : modal} />
      </Modal>

      <Modal open={!!depositGoal} onClose={() => setDepositGoal(null)} title="Depositar na meta" size="sm">
        {depositGoal && <DepositModal goal={depositGoal} onClose={() => setDepositGoal(null)} />}
      </Modal>
    </div>
  )
}
