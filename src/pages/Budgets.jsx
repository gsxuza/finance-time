import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { useHideValues } from '@/hooks/useHideValues'
import { useStore } from '@/store/useStore'
import { formatCurrency, DEFAULT_CATEGORIES } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'

function BudgetForm({ onClose, initial }) {
  const { addBudget, updateBudget } = useStore()
  const [form, setForm] = useState(initial || {
    category: 'Alimentação', amount: '', period: 'monthly',
    start_date: format(new Date(), 'yyyy-MM-dd'), alert_threshold: 80, is_active: true,
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, amount: parseFloat(form.amount) || 0, alert_threshold: parseInt(form.alert_threshold) || 80 }
    if (initial) updateBudget(initial.id, data)
    else addBudget(data)
    onClose()
  }
  const expenseCats = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense')
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
        {expenseCats.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Valor limite (R$)" type="number" step="0.01" required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        <Select label="Período" value={form.period} onChange={(e) => set('period', e.target.value)}>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
          <option value="yearly">Anual</option>
        </Select>
      </div>
      <Input label="Data início" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
      <Input label="Alerta (% do limite)" type="number" min="1" max="100" value={form.alert_threshold} onChange={(e) => set('alert_threshold', e.target.value)} />
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">{initial ? 'Salvar' : 'Criar orçamento'}</Button>
      </div>
    </form>
  )
}

export default function Budgets() {
  const { budgets, getBudgetSpent, deleteBudget } = useStore()
  const valuesHidden = useHideValues()
  const fmt = (v) => valuesHidden ? '•••••' : formatCurrency(v)
  const [modal, setModal] = useState(null)

  const budgetsWithSpent = useMemo(() => {
    return budgets.filter((b) => b.is_active).map((b) => {
      const spent = getBudgetSpent(b.category, b.period, b.start_date)
      const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
      return { ...b, spent, pct }
    })
  }, [budgets, getBudgetSpent])

  const getBarColor = (pct) => {
    if (pct >= 100) return 'bg-danger'
    if (pct >= 80) return 'bg-warning'
    return 'bg-success'
  }

  const getStatusColor = (pct) => {
    if (pct >= 100) return 'text-danger bg-danger-muted ring-1 ring-danger/20'
    if (pct >= 80) return 'text-warning bg-warning-muted ring-1 ring-warning/20'
    return 'text-success bg-success-muted ring-1 ring-success/20'
  }

  const PERIOD_LABELS = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-fg">Orçamentos</h1>
        <Button onClick={() => setModal('new')} size="sm"><Plus size={16} /> Novo</Button>
      </div>

      {budgetsWithSpent.length === 0 ? (
        <div className="text-center py-20 text-fg-muted">
          <p className="text-4xl mb-3">🎯</p>
          <p className="text-sm font-medium text-fg-secondary">Nenhum orçamento criado</p>
          <p className="text-xs mt-1">Crie orçamentos por categoria para controlar seus gastos</p>
          <Button onClick={() => setModal('new')} className="mt-4"><Plus size={16} /> Criar orçamento</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {budgetsWithSpent.map((b) => {
            const cat = DEFAULT_CATEGORIES.find((c) => c.name === b.category)
            const remaining = b.amount - b.spent
            return (
              <Card key={b.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat?.icon || '📦'}</span>
                      <div>
                        <p className="font-medium text-fg text-sm">{b.category}</p>
                        <p className="text-2xs text-fg-muted">{PERIOD_LABELS[b.period]}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 items-center">
                      {b.pct >= b.alert_threshold && (
                        <span title="Atenção: limite próximo" className="text-warning"><AlertTriangle size={13} /></span>
                      )}
                      <button onClick={() => setModal(b)} className="p-1.5 rounded-btn hover:bg-bg-hover text-fg-muted hover:text-fg cursor-pointer transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => deleteBudget(b.id)} className="p-1.5 rounded-btn hover:bg-danger-muted text-fg-muted hover:text-danger cursor-pointer transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-2xs text-fg-muted mb-1.5">
                    <span>{fmt(b.spent)} gasto</span>
                    <span className={`px-2 py-0.5 rounded-badge font-medium ${getStatusColor(b.pct)}`}>{b.pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1 bg-bg-elevated rounded-full overflow-hidden mb-2">
                    <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(b.pct)}`} style={{ width: `${Math.min(100, b.pct)}%` }} />
                  </div>
                  <div className="flex justify-between text-2xs">
                    <span className={remaining >= 0 ? 'text-fg-muted' : 'text-danger font-medium'}>
                      {remaining >= 0 ? `Restam ${fmt(remaining)}` : `${fmt(Math.abs(remaining))} acima do limite!`}
                    </span>
                    <span className="text-fg-muted">Limite: {fmt(b.amount)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          <button onClick={() => setModal('new')} className="border border-dashed border-border rounded-card p-5 flex flex-col items-center justify-center gap-2 text-fg-muted hover:text-fg hover:border-border-strong hover:bg-bg-elevated transition-all cursor-pointer min-h-[160px]">
            <Plus size={24} />
            <span className="text-sm font-medium">Novo orçamento</span>
          </button>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Novo Orçamento' : 'Editar Orçamento'}>
        <BudgetForm onClose={() => setModal(null)} initial={modal === 'new' ? null : modal} />
      </Modal>
    </div>
  )
}
