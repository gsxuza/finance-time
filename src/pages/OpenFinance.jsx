import { useState } from 'react'
import { format, addMonths, differenceInDays, parseISO } from 'date-fns'
import { Plus, RefreshCw, Unlink, AlertTriangle, CheckCircle2, ArrowRight, X } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDate, BANKS } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

const PERMISSIONS = [
  { id: 'balance', label: 'Saldo da conta', desc: 'Visualizar saldo em tempo real' },
  { id: 'transactions', label: 'Transações', desc: 'Histórico de movimentações' },
  { id: 'account_data', label: 'Dados da conta', desc: 'Número, tipo e titular' },
]

function ConnectBankFlow({ onClose }) {
  const { addBankConnection } = useStore()
  const [step, setStep] = useState(0)
  const [selectedBank, setSelectedBank] = useState(null)
  const [permissions, setPermissions] = useState(['balance', 'transactions', 'account_data'])
  const [accountType, setAccountType] = useState('checking')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const togglePermission = (id) => {
    setPermissions((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }

  const handleAuthorize = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      addBankConnection({
        bank_name: selectedBank.name,
        bank_code: selectedBank.code,
        account_type: accountType,
        account_number: '****' + Math.floor(1000 + Math.random() * 9000),
        consent_expires: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
        balance: Math.floor(1000 + Math.random() * 15000),
        last_sync: new Date().toISOString(),
      })
      setDone(true)
    }, 1500)
  }

  if (done) return (
    <div className="text-center py-6">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-emerald-500" />
      </div>
      <h3 className="font-bold text-slate-900 text-lg mb-2">Conectado com sucesso!</h3>
      <p className="text-sm text-slate-500 mb-2">{selectedBank.name} foi conectado ao Finance Time.</p>
      <p className="text-xs text-slate-400">Consentimento válido por 90 dias. Seus dados são protegidos por criptografia ponta a ponta conforme regulamentação do Banco Central.</p>
      <Button className="mt-6 w-full" onClick={onClose}>Concluir</Button>
    </div>
  )

  const steps = ['Banco', 'Permissões', 'Conta', 'Autorizar']

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center gap-1 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1">
            <div className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-blue-500' : 'bg-slate-100'}`} />
            {i < steps.length - 1 && <div className={`w-1 h-1 rounded-full ${i < step ? 'bg-blue-500' : 'bg-slate-100'}`} />}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 text-center mb-5">Etapa {step + 1} de {steps.length}: {steps[step]}</p>

      {/* Step 0: Select bank */}
      {step === 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-4">Selecione seu banco:</p>
          <div className="grid grid-cols-3 gap-2">
            {BANKS.map((bank) => (
              <button
                key={bank.code}
                onClick={() => setSelectedBank(bank)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedBank?.code === bank.code ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <span className="text-2xl">{bank.icon}</span>
                <span className="text-xs font-medium text-slate-700 text-center leading-tight">{bank.name}</span>
              </button>
            ))}
          </div>
          <Button className="w-full mt-5" disabled={!selectedBank} onClick={() => setStep(1)}>
            Continuar <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {/* Step 1: Permissions */}
      {step === 1 && (
        <div>
          <p className="text-sm text-slate-600 mb-4">Selecione as permissões para <strong>{selectedBank?.name}</strong>:</p>
          <div className="flex flex-col gap-3 mb-5">
            {PERMISSIONS.map((p) => (
              <div key={p.id} onClick={() => togglePermission(p.id)} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                <input type="checkbox" checked={permissions.includes(p.id)} readOnly className="mt-0.5 accent-blue-500" />
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.label}</p>
                  <p className="text-xs text-slate-400">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mb-4">🔒 Seus dados são protegidos por OAuth 2.0 e criptografia ponta a ponta, conforme regulamentação do Banco Central do Brasil.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Voltar</Button>
            <Button className="flex-1" onClick={() => setStep(2)}>Continuar <ArrowRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Step 2: Account type */}
      {step === 2 && (
        <div>
          <p className="text-sm text-slate-600 mb-4">Tipo de conta em <strong>{selectedBank?.name}</strong>:</p>
          <div className="flex flex-col gap-2 mb-5">
            {[['checking', '🏦 Conta Corrente'], ['savings', '🐷 Poupança'], ['credit_card', '💳 Cartão de Crédito']].map(([val, label]) => (
              <button key={val} onClick={() => setAccountType(val)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${accountType === val ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
                <span className="text-xl">{label.split(' ')[0]}</span>
                <span className="text-sm font-medium text-slate-700">{label.split(' ').slice(1).join(' ')}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Voltar</Button>
            <Button className="flex-1" onClick={() => setStep(3)}>Continuar <ArrowRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Step 3: Authorize */}
      {step === 3 && (
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 bg-slate-50">
            {BANKS.find((b) => b.code === selectedBank?.code)?.icon}
          </div>
          <p className="font-semibold text-slate-800 mb-1">{selectedBank?.name}</p>
          <p className="text-xs text-slate-500 mb-6">Você está prestes a autorizar o Finance Time a acessar seus dados bancários por 90 dias. Você pode revogar o acesso a qualquer momento.</p>
          <div className="bg-blue-50 rounded-xl p-4 mb-5 text-left">
            <p className="text-xs font-medium text-blue-700 mb-2">Permissões solicitadas:</p>
            {permissions.map((id) => {
              const p = PERMISSIONS.find((x) => x.id === id)
              return <p key={id} className="text-xs text-blue-600">✓ {p?.label}</p>
            })}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Voltar</Button>
            <Button className="flex-1" onClick={handleAuthorize} disabled={loading}>
              {loading ? '⏳ Conectando...' : '🔐 Autorizar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OpenFinance() {
  const { bankConnections, updateBankConnection, deleteBankConnection } = useStore()
  const [modal, setModal] = useState(false)

  const getExpiryWarning = (expires) => {
    if (!expires) return null
    const days = differenceInDays(parseISO(expires), new Date())
    if (days < 0) return 'Expirado'
    if (days < 7) return `Expira em ${days} dias`
    return null
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Open Finance</h1>
          <p className="text-xs text-slate-400 mt-0.5">Conecte suas contas bancárias de forma segura</p>
        </div>
        <Button onClick={() => setModal(true)} size="sm"><Plus size={16} /> Conectar banco</Button>
      </div>

      {/* Security banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Conexão 100% segura</p>
            <p className="text-xs text-blue-600 mt-0.5">OAuth 2.0 · Criptografia ponta a ponta · Regulamentação Banco Central · Consentimento revogável</p>
          </div>
        </div>
      </div>

      {bankConnections.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-4xl mb-3">🏦</p>
          <p className="text-sm font-medium">Nenhum banco conectado</p>
          <p className="text-xs mt-1">Conecte seus bancos para sincronizar saldo e transações automaticamente</p>
          <Button onClick={() => setModal(true)} className="mt-4"><Plus size={16} /> Conectar banco</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bankConnections.map((bc) => {
            const bank = BANKS.find((b) => b.code === bc.bank_code)
            const expiryWarning = getExpiryWarning(bc.consent_expires)
            return (
              <Card key={bc.id}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl shrink-0">
                        {bank?.icon || '🏦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-slate-800">{bc.bank_name}</p>
                          <StatusBadge status={bc.status} />
                          {expiryWarning && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                              <AlertTriangle size={10} /> {expiryWarning}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{bc.account_number} · {bc.account_type === 'checking' ? 'Conta Corrente' : bc.account_type === 'savings' ? 'Poupança' : 'Cartão'}</p>
                        <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(bc.balance)}</p>
                        <p className="text-xs text-slate-400">Última sync: {bc.last_sync ? new Date(bc.last_sync).toLocaleString('pt-BR') : 'Nunca'}</p>
                        <p className="text-xs text-slate-400">Consentimento: até {formatDate(bc.consent_expires)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => updateBankConnection(bc.id, { last_sync: new Date().toISOString(), status: 'connected' })} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                        <RefreshCw size={12} /> Sincronizar
                      </button>
                      <button onClick={() => updateBankConnection(bc.id, { status: bc.status === 'connected' ? 'expired' : 'connected' })} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 cursor-pointer">
                        <Unlink size={12} /> {bc.status === 'connected' ? 'Revogar' : 'Reconectar'}
                      </button>
                      <button onClick={() => deleteBankConnection(bc.id)} className="flex items-center gap-1 text-xs text-slate-300 hover:text-red-500 cursor-pointer">
                        <X size={12} /> Remover
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Conectar Banco" size="lg">
        <ConnectBankFlow onClose={() => setModal(false)} />
      </Modal>
    </div>
  )
}
