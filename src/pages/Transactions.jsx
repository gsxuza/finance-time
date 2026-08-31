import { useState, useMemo } from 'react'
import { format, startOfWeek, startOfMonth, subMonths, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Search, Trash2, Edit2, Sparkles } from 'lucide-react'
import { useHideValues } from '@/hooks/useHideValues'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDate, countsAsFlow, DEFAULT_CATEGORIES } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ImportCSVButton } from '@/components/ImportCSV'

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'this_week', label: 'Esta semana' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_3', label: 'Últimos 3 meses' },
]

function TransactionForm({ onClose, initial }) {
  const { accounts, addTransaction, updateTransaction } = useStore()
  const [form, setForm] = useState(initial || {
    type: 'expense', amount: '', description: '', date: format(new Date(), 'yyyy-MM-dd'),
    category: 'Alimentação', account_id: accounts[0]?.id || '', is_recurring: false,
    recurring_frequency: 'monthly', location: '', tags: '',
  })
  const [aiLoading, setAiLoading] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleAISuggest = () => {
    if (!form.description) return
    setAiLoading(true)
    setTimeout(() => {
      const lower = form.description.toLowerCase()
      let cat = 'Outros'
      if (lower.includes('mercado') || lower.includes('supermercado')) cat = 'Supermercado'
      else if (lower.includes('restaurante') || lower.includes('lanche') || lower.includes('pizza')) cat = 'Restaurante'
      else if (lower.includes('uber') || lower.includes('combustível') || lower.includes('ônibus')) cat = 'Transporte'
      else if (lower.includes('aluguel') || lower.includes('condomínio')) cat = 'Moradia'
      else if (lower.includes('médico') || lower.includes('farmácia') || lower.includes('consulta')) cat = 'Saúde'
      else if (lower.includes('netflix') || lower.includes('spotify') || lower.includes('cinema')) cat = 'Lazer'
      else if (lower.includes('curso') || lower.includes('escola') || lower.includes('faculdade')) cat = 'Educação'
      else if (lower.includes('salário') || lower.includes('salario')) cat = 'Salário'
      else if (lower.includes('freelance') || lower.includes('projeto')) cat = 'Freelance'
      set('category', cat)
      setAiLoading(false)
    }, 800)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, amount: parseFloat(form.amount) || 0 }
    if (initial) updateTransaction(initial.id, data)
    else addTransaction(data)
    onClose()
  }

  const expenseCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'expense')
  const incomeCategories = DEFAULT_CATEGORIES.filter((c) => c.type === 'income')
  const filteredCategories = form.type === 'income' ? incomeCategories : expenseCategories

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Type toggle */}
      <div className="flex rounded-btn bg-bg-elevated ring-1 ring-border p-1 gap-1">
        {['expense', 'income'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => set('type', t)}
            className={`flex-1 py-2 rounded-btn text-sm font-medium transition-all cursor-pointer ${form.type === t ? (t === 'income' ? 'bg-success-muted text-success ring-1 ring-success/20' : 'bg-danger-muted text-danger ring-1 ring-danger/20') : 'text-fg-muted hover:text-fg'}`}
          >
            {t === 'income' ? '↑ Receita' : '↓ Despesa'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Valor (R$)" type="number" step="0.01" placeholder="0,00" required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        <Input label="Data" type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input label="Descrição" placeholder="Ex: Supermercado" value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={handleAISuggest} disabled={aiLoading} title="Sugerir categoria com IA" className="shrink-0 h-[42px] w-[42px]">
          <Sparkles size={16} className={aiLoading ? 'animate-pulse text-violet-500' : 'text-violet-500'} />
        </Button>
      </div>

      <Select label="Categoria" value={form.category} onChange={(e) => set('category', e.target.value)}>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
        ))}
      </Select>

      <Select label="Conta" value={form.account_id} onChange={(e) => set('account_id', e.target.value)}>
        {accounts.filter((a) => a.is_active).map((a) => (
          <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Local (opcional)" placeholder="Ex: São Paulo" value={form.location} onChange={(e) => set('location', e.target.value)} />
        <Input label="Tags (opcional)" placeholder="Ex: viagem, lazer" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="recurring" checked={form.is_recurring} onChange={(e) => set('is_recurring', e.target.checked)} className="accent-blue-500" />
        <label htmlFor="recurring" className="text-sm text-fg-secondary cursor-pointer">Transação recorrente</label>
        {form.is_recurring && (
          <Select value={form.recurring_frequency} onChange={(e) => set('recurring_frequency', e.target.value)} className="!py-1.5">
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </Select>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">{initial ? 'Salvar' : 'Adicionar'}</Button>
      </div>
    </form>
  )
}

export default function Transactions() {
  const { transactions, deleteTransaction, categories } = useStore()
  const valuesHidden = useHideValues()
  const fmt = (v) => valuesHidden ? '•••••' : formatCurrency(v)
  const [modal, setModal] = useState(null) // null | 'new' | tx object
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('this_month')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    const today = new Date()
    let cutoff = null
    if (period === 'this_week') cutoff = startOfWeek(today, { weekStartsOn: 1 })
    if (period === 'this_month') cutoff = startOfMonth(today)
    if (period === 'last_3') cutoff = subMonths(today, 3)

    return transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false
        if (search && !t.description?.toLowerCase().includes(search.toLowerCase()) && !t.category?.toLowerCase().includes(search.toLowerCase())) return false
        if (cutoff && new Date(t.date) < cutoff) return false
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, period, typeFilter, search])

  // Group by date
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach((t) => {
      if (!map[t.date]) map[t.date] = []
      map[t.date].push(t)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totalIncome = filtered.filter((t) => t.type === 'income' && countsAsFlow(t)).reduce((s, t) => s + (t.amount || 0), 0)
  const totalExpense = filtered.filter((t) => t.type === 'expense' && countsAsFlow(t)).reduce((s, t) => s + (t.amount || 0), 0)

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-fg">Transações</h1>
        <div className="flex gap-2">
          <ImportCSVButton />
          <Button onClick={() => setModal('new')} size="sm">
            <Plus size={16} /> Nova
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-bg-surface ring-border ring-1 rounded-card p-4">
          <p className="text-xs text-fg-muted font-medium mb-1">Receitas</p>
          <p className="text-lg font-bold text-success">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-bg-surface ring-border ring-1 rounded-card p-4">
          <p className="text-xs text-fg-muted font-medium mb-1">Despesas</p>
          <p className="text-lg font-bold text-danger">{fmt(totalExpense)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-btn bg-bg-elevated ring-1 ring-border text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-border-strong transition-all"
            placeholder="Buscar transações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-2 rounded-btn bg-bg-elevated ring-1 ring-border text-sm text-fg focus:outline-none">
          {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 rounded-btn bg-bg-elevated ring-1 ring-border text-sm text-fg focus:outline-none">
          <option value="all">Todos tipos</option>
          <option value="income">Receitas</option>
          <option value="expense">Despesas</option>
        </select>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="text-center py-16 text-fg-muted">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">Nenhuma transação encontrada</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([date, txs]) => {
            const dayTotal = txs.filter(countsAsFlow).reduce((s, t) => s + (t.type === 'income' ? (t.amount || 0) : -(t.amount || 0)), 0)
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-medium text-fg-muted">{formatDate(date)}</span>
                  <span className={`text-xs font-medium ${dayTotal >= 0 ? 'text-success' : 'text-danger'}`}>
                    {dayTotal >= 0 ? '+' : ''}{fmt(dayTotal)}
                  </span>
                </div>
                <Card>
                  <div className="divide-y divide-border-subtle">
                    {txs.map((tx) => {
                      const cat = DEFAULT_CATEGORIES.find((c) => c.name === tx.category)
                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-bg-elevated transition-colors">
                          <div className="w-9 h-9 rounded-btn flex items-center justify-center text-base shrink-0 bg-bg-elevated">
                            {tx.is_transfer ? '↔' : (cat?.icon || '📦')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-fg truncate">{tx.description || tx.category}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-2xs text-fg-muted">{tx.category}</span>
                              {tx.is_recurring && <span className="text-2xs bg-blue-muted text-blue px-1.5 py-0.5 rounded-badge">🔄 {tx.recurring_frequency}</span>}
                              {tx.is_transfer && <span className="text-2xs bg-bg-elevated text-fg-muted px-1.5 py-0.5 rounded-badge ring-1 ring-border">↔ Transferência</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold tabular-nums ${tx.is_transfer ? 'text-fg-muted' : tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                              {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                            </span>
                            <div className="hidden group-hover:flex gap-1">
                              <button onClick={() => setModal(tx)} className="p-1.5 rounded-btn hover:bg-bg-hover text-fg-muted hover:text-fg cursor-pointer transition-colors"><Edit2 size={13} /></button>
                              <button onClick={() => deleteTransaction(tx.id)} className="p-1.5 rounded-btn hover:bg-danger-muted text-fg-muted hover:text-danger cursor-pointer transition-colors"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nova Transação' : 'Editar Transação'}>
        <TransactionForm onClose={() => setModal(null)} initial={modal === 'new' ? null : modal} />
      </Modal>
    </div>
  )
}
