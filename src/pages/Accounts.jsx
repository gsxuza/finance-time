import { useState } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
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
        <label className="text-sm font-medium text-slate-700 mb-2 block">Cor</label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button type="button" key={c} onClick={() => set('color', c)} className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${form.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="active" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="accent-blue-500" />
        <label htmlFor="active" className="text-sm text-slate-700 cursor-pointer">Conta ativa</label>
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
  const [hideBalances, setHideBalances] = useState(false)

  const totalBalance = accounts.filter((a) => a.is_active && a.type !== 'credit_card').reduce((s, a) => s + a.balance, 0)
  const totalDebt = accounts.filter((a) => a.is_active && a.type === 'credit_card').reduce((s, a) => s + Math.abs(a.balance), 0)

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Contas</h1>
        <div className="flex gap-2">
          <button onClick={() => setHideBalances(!hideBalances)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer">
            {hideBalances ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <Button onClick={() => setModal('new')} size="sm"><Plus size={16} /> Nova</Button>
        </div>
      </div>

      {/* Patrimônio */}
      <div className="gradient-primary rounded-2xl p-5 mb-5 text-white">
        <p className="text-sm text-white/80 mb-1">Patrimônio Total</p>
        <p className="text-3xl font-bold">{hideBalances ? '••••••' : formatCurrency(totalBalance)}</p>
        {totalDebt > 0 && <p className="text-sm text-white/70 mt-1">Dívida cartões: {hideBalances ? '•••' : formatCurrency(totalDebt)}</p>}
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
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: acc.color + '22' }}>
                      {acc.icon || ACCOUNT_TYPE_ICONS[acc.type]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{acc.name}</p>
                      <p className="text-xs text-slate-400">{ACCOUNT_TYPE_LABELS[acc.type]}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!acc.is_active && <Badge variant="default">Inativa</Badge>}
                    <button onClick={() => setModal(acc)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><Edit2 size={14} /></button>
                    <button onClick={() => deleteAccount(acc.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </div>
                <p className={`text-2xl font-bold ${acc.balance >= 0 ? 'text-slate-800' : 'text-rose-500'}`}>
                  {hideBalances ? '••••' : formatCurrency(acc.balance)}
                </p>
                {acc.credit_limit && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Usado: {hideBalances ? '•••' : formatCurrency(Math.abs(acc.balance))}</span>
                      <span>Limite: {hideBalances ? '•••' : formatCurrency(acc.credit_limit)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, usedPercent)}%`, background: usedPercent > 80 ? '#f43f5e' : '#3b82f6' }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Disponível: {hideBalances ? '•••' : formatCurrency(Math.max(0, acc.credit_limit - Math.abs(acc.balance)))}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Add new card */}
        <button onClick={() => setModal('new')} className="border-2 border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer min-h-[140px]">
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
