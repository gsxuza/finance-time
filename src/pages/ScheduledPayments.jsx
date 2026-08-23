import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, Edit2, Trash2, Send, RotateCcw } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'

function ScheduledForm({ onClose, initial }) {
  const { patients, paymentLinks, addScheduledPayment, updateScheduledPayment, settings } = useStore()
  const [form, setForm] = useState(initial || {
    payment_link_id: '',
    patient_id: patients[0]?.id || '',
    scheduled_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    message_template: settings.default_payment_message || 'Olá {nome}! Lembrete de pagamento de {valor} com vencimento em {data}. Acesse: {link}',
  })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const selectedPatient = patients.find((p) => p.id === form.patient_id)
  const selectedLink = paymentLinks.find((l) => l.id === form.payment_link_id)
  const availableLinks = paymentLinks.filter((l) => l.patient_id === form.patient_id && l.status === 'pending')

  const preview = form.message_template
    .replace('{nome}', selectedPatient?.name || '')
    .replace('{valor}', selectedLink ? formatCurrency(selectedLink.amount) : 'R$ 0,00')
    .replace('{data}', selectedLink?.due_date || '')
    .replace('{juros}', `${selectedLink?.interest_rate || 0}%`)
    .replace('{link}', selectedLink ? `https://finance-time.app/pay/${selectedLink.link_code}` : '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (initial) updateScheduledPayment(initial.id, form)
    else addScheduledPayment(form)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Select label="Paciente" required value={form.patient_id} onChange={(e) => { set('patient_id', e.target.value); set('payment_link_id', '') }}>
        <option value="">Selecione...</option>
        {patients.filter((p) => p.status === 'active').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </Select>

      <Select label="Link de pagamento" required value={form.payment_link_id} onChange={(e) => set('payment_link_id', e.target.value)}>
        <option value="">Selecione...</option>
        {availableLinks.map((l) => <option key={l.id} value={l.id}>{formatCurrency(l.amount)} — vence {l.due_date}</option>)}
      </Select>

      <Input label="Data e hora do envio" type="datetime-local" required value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} />

      <Textarea
        label="Mensagem (use {nome}, {valor}, {data}, {juros}, {link})"
        rows={3}
        value={form.message_template}
        onChange={(e) => set('message_template', e.target.value)}
      />

      {form.message_template && selectedPatient && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3">
          <p className="text-xs text-green-600 font-medium mb-1">Preview:</p>
          <p className="text-xs text-green-800 leading-relaxed">{preview}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">{initial ? 'Salvar' : 'Agendar envio'}</Button>
      </div>
    </form>
  )
}

export default function ScheduledPayments() {
  const { scheduledPayments, patients, paymentLinks, deleteScheduledPayment, updateScheduledPayment } = useStore()
  const [modal, setModal] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() =>
    scheduledPayments
      .filter((sp) => statusFilter === 'all' || sp.status === statusFilter)
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)),
    [scheduledPayments, statusFilter]
  )

  const getPatient = (id) => patients.find((p) => p.id === id)
  const getLink = (id) => paymentLinks.find((l) => l.id === id)

  const STATUS_TABS = ['all', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled']

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Agendamentos WhatsApp</h1>
        <Button onClick={() => setModal('new')} size="sm"><Plus size={16} /> Agendar</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5 overflow-x-auto scrollbar-hide">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer capitalize ${statusFilter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {s === 'all' ? 'Todos' : s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">📲</p>
          <p className="text-sm font-medium">Nenhum agendamento</p>
          <Button onClick={() => setModal('new')} className="mt-4"><Plus size={16} /> Agendar envio</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((sp) => {
            const patient = getPatient(sp.patient_id)
            const link = getLink(sp.payment_link_id)
            return (
              <Card key={sp.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800">{patient?.name || 'Paciente removido'}</p>
                        <StatusBadge status={sp.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
                        <div>
                          <span className="text-slate-400">Agendado para:</span>
                          <p className="text-slate-700 font-medium">{sp.scheduled_date?.replace('T', ' ')?.slice(0, 16)}</p>
                        </div>
                        {link && (
                          <div>
                            <span className="text-slate-400">Link:</span>
                            <p className="text-slate-700">{formatCurrency(link.amount)} — {link.link_code}</p>
                          </div>
                        )}
                        {sp.retry_count > 0 && (
                          <div>
                            <span className="text-slate-400">Tentativas:</span>
                            <p className="text-slate-700">{sp.retry_count}</p>
                          </div>
                        )}
                      </div>
                      {sp.message_template && (
                        <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-2 line-clamp-2">{sp.message_template}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 ml-3">
                      {sp.status === 'scheduled' && (
                        <>
                          <button onClick={() => setModal(sp)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer"><Edit2 size={12} /> Editar</button>
                          <button onClick={() => updateScheduledPayment(sp.id, { status: 'cancelled' })} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 size={12} /> Cancelar</button>
                        </>
                      )}
                      {sp.status === 'failed' && (
                        <button onClick={() => updateScheduledPayment(sp.id, { status: 'scheduled', retry_count: sp.retry_count + 1 })} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 cursor-pointer">
                          <RotateCcw size={12} /> Reenviar
                        </button>
                      )}
                      <button onClick={() => deleteScheduledPayment(sp.id)} className="flex items-center gap-1 text-xs text-slate-300 hover:text-red-500 cursor-pointer"><Trash2 size={12} /> Excluir</button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Agendar Envio' : 'Editar Agendamento'} size="lg">
        <ScheduledForm onClose={() => setModal(null)} initial={modal === 'new' ? null : modal} />
      </Modal>
    </div>
  )
}
