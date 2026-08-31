import { useState } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
import { useHideValues } from '@/hooks/useHideValues'
import { useStore } from '@/store/useStore'
import { formatCurrency, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Input'

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16']

function AccountForm({ onClose, initial }) {
  const { addAccount, updateAccount } = useStore()
  const [form, setForm] = useState(initial || {
    name: '', type: 'checking', balance: '', color: '#3b82f6', icon: '🏦', is_active: true, credit_limit: '',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const ICONS = { checking: '🏦', savings: '🐷', credit_card: '💳', cash: '💵', investment: '📈' }

  const handleTypeChange = (type) => {
    set('type', type)
    set('icon', ICONS[type])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form, balance: parseFloat(form.balance) || 0, credit_limit: parseFloat(form.credit_limit) || undefined }
    if (initial) updateAccount(initial.id, data)
    else addAccount(data)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nome da conta" required placeholder="Ex: Nubank, Poupança" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <Select label="Tipo de conta" value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
        {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{ACCOUNT_TYPE_ICONS[k]} {v}</option>)}
      </Select>
      <Input label={form.type === 'credit_card' ? 'Saldo devedor (R$)' : 'Saldo atual (R$)'} type="number" step="0.01" value={form.balance} onChange={(e) => set('balance', e.target.value)} />
      {form.type === 'credit_card' && (
        <Input label="Limite de crédito (R$)" type="number" step="0.01" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} />
      )}
      <div>
        <label className="text-xs font-medium text-fg-secondary mb-2 block">Cor</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button type="button" key={c} onClick={() => set('color', c)} className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${form.color === c ? 'border-fg scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="active" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="accent-fg" />
        <label htmlFor="active" className="text-sm text-fg-secondary cursor-pointer">Conta ativa</label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">{initial ? 'Salvar' : 'Criar conta'}</Button>
      </div>
    </form>
  )
}

export default function Accounts() {
  const { accounts, deleteAccount } = useStore()
  const [modal, setModal] = useState(null)
  const hideBalances = useHideValues()

  const totalBalance = accounts.filter((a) => a.is_active && a.type !== 'credit_card').reduce((s, a) => s + a.balance, 0)
  const totalDebt = accounts.filter((a) => a.is_active && a.type === 'credit_card').reduce((s, a) => s + Math.abs(a.balance), 0)

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-fg">Contas</h1>
        <div className="flex gap-2">
          <Button onClick={() => setModal('new')} size="sm"><Plus size={16} /> Nova</Button>
        </div>
      </div>

      {/* Patrimônio */}
      <div className="bg-bg-surface ring-1 ring-border rounded-card p-5 mb-5">
        <p className="text-xs text-fg-muted font-medium uppercase tracking-widest mb-2">Patrimônio Total</p>
        <p className="text-3xl font-bold text-fg tabular-nums">{hideBalances ? '••••••' : formatCurrency(totalBalance)}</p>
        {totalDebt > 0 && <p className="text-sm text-danger mt-2">Dívida cartões: {hideBalances ? '•••' : formatCurrency(totalDebt)}</p>}
      </div>

      {/* Accounts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {accounts.map((acc) => {
          const usedPercent = acc.credit_limit ? (Math.abs(acc.balance) / acc.credit_limit) * 100 : 0
          return (
            <Card key={acc.id} className={!acc.is_active ? 'opacity-60' : ''}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-btn flex items-center justify-center text-base bg-bg-elevated shrink-0">
                      {acc.icon || ACCOUNT_TYPE_ICONS[acc.type]}
                    </div>
                    <div>
                      <p className="font-medium text-fg text-sm">{acc.name}</p>
                      <p className="text-2xs text-fg-muted">{ACCOUNT_TYPE_LABELS[acc.type]}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 items-center">
                    {!acc.is_active && <Badge variant="default">Inativa</Badge>}
                    <button onClick={() => setModal(acc)} className="p-1.5 rounded-btn hover:bg-bg-hover text-fg-muted hover:text-fg cursor-pointer transition-colors"><Edit2 size={13} /></button>
                    <button onClick={() => deleteAccount(acc.id)} className="p-1.5 rounded-btn hover:bg-danger-muted text-fg-muted hover:text-danger cursor-pointer transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${acc.balance >= 0 ? 'text-fg' : 'text-danger'}`}>
                  {hideBalances ? '••••' : formatCurrency(acc.balance)}
                </p>
                {acc.credit_limit && (
                  <div className="mt-3">
                    <div className="flex justify-between text-2xs text-fg-muted mb-1.5">
                      <span>Usado: {hideBalances ? '•••' : formatCurrency(Math.abs(acc.balance))}</span>
                      <span>Limite: {hideBalances ? '•••' : formatCurrency(acc.credit_limit)}</span>
                    </div>
                    <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, usedPercent)}%`, background: usedPercent > 80 ? '#f87171' : '#60a5fa' }} />
                    </div>
                    <p className="text-2xs text-fg-muted mt-1.5">Disponível: {hideBalances ? '•••' : formatCurrency(Math.max(0, acc.credit_limit - Math.abs(acc.balance)))}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Add new card */}
        <button onClick={() => setModal('new')} className="border border-dashed border-border rounded-card p-5 flex flex-col items-center justify-center gap-2 text-fg-muted hover:text-fg hover:border-border-strong hover:bg-bg-elevated transition-all cursor-pointer min-h-[140px]">
          <Plus size={24} />
          <span className="text-sm font-medium">Nova conta</span>
        </button>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Nova Conta' : 'Editar Conta'}>
        <AccountForm onClose={() => setModal(null)} initial={modal === 'new' ? null : modal} />
      </Modal>
    </div>
  )
}
