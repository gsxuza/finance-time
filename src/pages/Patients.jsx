import { useState, useMemo } from 'react'
import { Plus, Search, Edit2, Trash2, Phone, Mail, Link2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, getInitials } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Input'

function PatientForm({ onClose, initial }) {
  const { addPatient, updatePatient } = useStore()
  const [form, setForm] = useState(initial || { name: '', phone: '', email: '', notes: '', status: 'active' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const handleSubmit = (e) => {
    e.preventDefault()
    if (initial) updatePatient(initial.id, form)
    else addPatient(form)
    onClose()
  }
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nome completo" required placeholder="Ex: Maria Silva" value={form.name} onChange={(e) => set('name', e.target.value)} />
      <Input label="WhatsApp" required placeholder="11987654321" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
      <Input label="Email (opcional)" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
      <Textarea label="Observações" placeholder="Notas sobre o paciente..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
        <option value="active">Ativo</option>
        <option value="inactive">Inativo</option>
      </Select>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1">{initial ? 'Salvar' : 'Cadastrar'}</Button>
      </div>
    </form>
  )
}

function PatientDetail({ patient, onClose }) {
  const { paymentLinks } = useStore()
  const links = paymentLinks.filter((l) => l.patient_id === patient.id)
  return (
    <div>
      {/* Avatar + info */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-white text-xl font-bold">
          {getInitials(patient.name)}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">{patient.name}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <Phone size={13} /> {patient.phone}
          </div>
          {patient.email && <div className="flex items-center gap-2 text-sm text-slate-500"><Mail size={13} /> {patient.email}</div>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-600 font-medium">Total pago</p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrency(patient.total_paid)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3">
          <p className="text-xs text-amber-600 font-medium">Pendente</p>
          <p className="text-lg font-bold text-amber-700">{formatCurrency(patient.pending_amount)}</p>
        </div>
      </div>

      <h4 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">Links de Pagamento</h4>
      {links.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">Nenhum link criado</p>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-800">{formatCurrency(l.amount)}</p>
                <p className="text-xs text-slate-400">Vence: {l.due_date}</p>
              </div>
              <StatusBadge status={l.status} />
            </div>
          ))}
        </div>
      )}

      {patient.notes && (
        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-600 font-medium mb-1">Observações</p>
          <p className="text-sm text-blue-800">{patient.notes}</p>
        </div>
      )}
    </div>
  )
}

export default function Patients() {
  const { patients, deletePatient } = useStore()
  const [modal, setModal] = useState(null)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() =>
    patients.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.phone?.includes(search)) return false
      return true
    }),
    [patients, search, statusFilter]
  )

  const AVATAR_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#06b6d4']

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Pacientes</h1>
        <Button onClick={() => setModal('new')} size="sm"><Plus size={16} /> Novo</Button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm font-medium">Nenhum paciente encontrado</p>
          <Button onClick={() => setModal('new')} className="mt-4"><Plus size={16} /> Cadastrar paciente</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p, i) => (
            <Card key={p.id} className={`cursor-pointer hover:shadow-md transition-shadow ${p.status === 'inactive' ? 'opacity-70' : ''}`} onClick={() => setDetail(p)}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                      {getInitials(p.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{p.name}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setModal(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><Edit2 size={14} /></button>
                    <button onClick={() => deletePatient(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><Phone size={11} /> {p.phone}</div>
                  {p.email && <div className="flex items-center gap-1.5"><Mail size={11} /> {p.email}</div>}
                </div>

                <div className="flex gap-2 mt-3">
                  <div className="flex-1 bg-emerald-50 rounded-lg p-2">
                    <p className="text-xs text-emerald-600 font-medium">Pago</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(p.total_paid)}</p>
                  </div>
                  {p.pending_amount > 0 && (
                    <div className="flex-1 bg-amber-50 rounded-lg p-2">
                      <p className="text-xs text-amber-600 font-medium">Pendente</p>
                      <p className="text-sm font-bold text-amber-700">{formatCurrency(p.pending_amount)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Novo Paciente' : 'Editar Paciente'}>
        <PatientForm onClose={() => setModal(null)} initial={modal === 'new' ? null : modal} />
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detalhes do Paciente">
        {detail && <PatientDetail patient={detail} onClose={() => setDetail(null)} />}
      </Modal>
    </div>
  )
}
