import { useState, useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { Plus, Copy, MessageCircle, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDate, getDaysLate, calcInterest } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'

const STATUS_TABS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'paid', label: 'Pagos' },
  { value: 'cancelled', label: 'Cancelados' },
]

function PaymentLinkForm({ onClose }) {
  const { patients, settings, addPaymentLink } = useStore()
  const [form, setForm] = useState({
    patient_id: patients[0]?.id || '',
    amount: '',
    due_date: format(addDays(new Date(), settings.default_payment_validity || 3), 'yyyy-MM-dd'),
    interest_rate: settings.default_interest_rate || 3.3,
    message: settings.default_payment_message || 'Olá {nome}! Seu pagamento de {valor} vence em {data}. Acesse: {link}',
    validity_days: settings.default_payment_validity || 3,
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const selectedPatient = patients.find((p) => p.id === form.patient_id)

  const preview = form.message
    .replace('{nome}', selectedPatient?.name || 'Paciente')
    .replace('{valor}', formatCurrency(parseFloat(form.amount) || 0))
    .replace('{data}', form.due_date)
    .replace('{juros}', `${form.interest_rate}%`)
    .replace('{link}', 'https://ft.link/ABC123')

  const handleSubmit = (e) => {
    e.preventDefault()
    const patient = patients.find((p) => p.id === form.patient_id)
    addPaymentLink({
      patient_id: form.patient_id,
      patient_name: patient?.name || '',
      amount: parseFloat(form.amount) || 0,
      due_date: form.due_date,
      interest_rate: parseFloat(form.interest_rate) || 0,
      message: form.message,
    })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select label="Paciente" required value={form.patient_id} onChange={(e) => set('patient_id', e.target.value)}>
        <option value="">Selecione...</option>
        {patients.filter((p) => p.status === 'active').map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Valor (R$)" type="number" step="0.01" required value={form.amount} onChange={(e) => set('amount', e.target.value)} />
        <Input label="Vencimento" type="date" required value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Juros diário (%)" type="number" step="0.1" value={form.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} />
        <Input label="Validade (dias)" type="number" value={form.validity_days} onChange={(e) => {
          set('validity_days', e.target.value)
          set('due_date', format(addDays(new Date(), parseInt(e.target.value) || 3), 'yyyy-MM-dd'))
        }} />
      </div>

      <Textarea
        label="Mensagem (use {nome}, {valor}, {data}, {juros}, {link})"
        rows={3}
        value={form.message}
        onChange={(e) => set('message', e.target.value)}
      />

      {form.message && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
          <p className="text-xs text-green-600 font-medium mb-1">Preview da mensagem:</p>
          <p className="text-xs text-green-800 leading-relaxed whitespace-pre-wrap">{preview}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">Criar link</Button>
      </div>
    </form>
  )
}

export default function PaymentLinks() {
  const { paymentLinks, patients, markLinkPaid, updatePaymentLink, deletePaymentLink } = useStore()
  const [modal, setModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmPay, setConfirmPay] = useState(null)

  const filtered = useMemo(() => {
    let links = paymentLinks.map((l) => {
      const daysLate = getDaysLate(l.due_date)
      const isOverdue = daysLate > 0 && (l.status === 'pending' || l.status === 'overdue')
      return { ...l, status: isOverdue ? 'overdue' : l.status, daysLate, currentAmount: calcInterest(l.amount, l.interest_rate || 0, daysLate) }
    })
    if (statusFilter !== 'all') links = links.filter((l) => l.status === statusFilter)
    return links.sort((a, b) => a.due_date.localeCompare(b.due_date))
  }, [paymentLinks, statusFilter])

  const copyLink = (code) => {
    navigator.clipboard.writeText(`https://finance-time.app/pay/${code}`)
      .catch(() => {})
    alert(`Link copiado! https://finance-time.app/pay/${code}`)
  }

  const sendWhatsApp = (link) => {
    const patient = patients.find((p) => p.id === link.patient_id)
    if (!patient) return
    const msg = encodeURIComponent(
      (link.message || `Olá! Seu pagamento de ${formatCurrency(link.currentAmount)} vence em ${link.due_date}. Acesse: https://finance-time.app/pay/${link.link_code}`)
        .replace('{nome}', patient.name)
        .replace('{valor}', formatCurrency(link.currentAmount))
        .replace('{data}', link.due_date)
        .replace('{juros}', `${link.interest_rate}%`)
        .replace('{link}', `https://finance-time.app/pay/${link.link_code}`)
    )
    window.open(`https://wa.me/55${patient.phone}?text=${msg}`, '_blank')
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Links de Pagamento</h1>
        <Button onClick={() => setModal(true)} size="sm"><Plus size={16} /> Novo</Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusFilter(t.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${statusFilter === t.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label} {t.value !== 'all' && `(${paymentLinks.filter((l) => {
              const d = getDaysLate(l.due_date)
              const s = d > 0 && (l.status === 'pending' || l.status === 'overdue') ? 'overdue' : l.status
              return s === t.value
            }).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-sm font-medium">Nenhum link encontrado</p>
          <Button onClick={() => setModal(true)} className="mt-4"><Plus size={16} /> Criar link</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((link) => {
            const hasInterest = link.daysLate > 0 && link.status === 'overdue'
            return (
              <Card key={link.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800">{link.patient_name}</p>
                        <StatusBadge status={link.status} />
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-slate-400 text-xs">Valor</span>
                          <p className={`font-bold ${link.status === 'overdue' ? 'text-red-600' : 'text-slate-800'}`}>
                            {formatCurrency(link.currentAmount)}
                          </p>
                          {hasInterest && (
                            <p className="text-xs text-slate-400 line-through">{formatCurrency(link.amount)}</p>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 text-xs">Vencimento</span>
                          <p className="text-sm text-slate-700">{formatDate(link.due_date)}</p>
                        </div>
                        {link.daysLate > 0 && link.status === 'overdue' && (
                          <div>
                            <span className="text-xs text-red-400">Em atraso</span>
                            <p className="text-sm font-medium text-red-600">{link.daysLate} dia{link.daysLate > 1 ? 's' : ''}</p>
                          </div>
                        )}
                        {link.status === 'paid' && (
                          <div>
                            <span className="text-xs text-slate-400">Pago em</span>
                            <p className="text-sm text-slate-600">{formatDate(link.paid_date)}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">Código: {link.link_code}</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {link.status !== 'paid' && link.status !== 'cancelled' && (
                        <>
                          <button onClick={() => copyLink(link.link_code)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                            <Copy size={12} /> Copiar link
                          </button>
                          <button onClick={() => sendWhatsApp(link)} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 cursor-pointer">
                            <MessageCircle size={12} /> WhatsApp
                          </button>
                          <button onClick={() => setConfirmPay(link)} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 cursor-pointer">
                            <CheckCircle size={12} /> Marcar pago
                          </button>
                          <button onClick={() => updatePaymentLink(link.id, { status: 'cancelled' })} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 cursor-pointer">
                            <XCircle size={12} /> Cancelar
                          </button>
                        </>
                      )}
                      <button onClick={() => deletePaymentLink(link.id)} className="flex items-center gap-1 text-xs text-slate-300 hover:text-red-500 cursor-pointer">
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Link de Pagamento" size="lg">
        <PaymentLinkForm onClose={() => setModal(false)} />
      </Modal>

      {/* Confirm payment modal */}
      <Modal open={!!confirmPay} onClose={() => setConfirmPay(null)} title="Confirmar Pagamento" size="sm">
        {confirmPay && (
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Confirmar pagamento de <strong>{formatCurrency(confirmPay.currentAmount)}</strong> de <strong>{confirmPay.patient_name}</strong>?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmPay(null)}>Cancelar</Button>
              <Button variant="success" className="flex-1" onClick={() => { markLinkPaid(confirmPay.id, confirmPay.currentAmount); setConfirmPay(null) }}>
                <CheckCircle size={16} /> Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
