import { useState } from 'react'
import { TrendingUp, Wallet, Settings, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useStore } from '@/store/useStore'

const STEPS = [
  {
    icon: TrendingUp,
    title: 'Bem-vindo ao Finance Time!',
    desc: 'Sua plataforma completa de gestão financeira com IA, automação de cobranças e Open Finance.',
    gradient: 'from-blue-500 to-violet-500',
  },
  {
    icon: Wallet,
    title: 'Crie sua primeira conta',
    desc: 'Comece adicionando uma conta bancária para registrar suas transações.',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    icon: Settings,
    title: 'Configure seus padrões',
    desc: 'Defina a taxa de juros e validade padrão para links de pagamento.',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    icon: CheckCircle2,
    title: 'Tudo pronto!',
    desc: 'Sua conta está configurada. Vamos começar a gerenciar suas finanças!',
    gradient: 'from-violet-500 to-pink-500',
  },
]

export function Onboarding() {
  const [step, setStep] = useState(0)
  const [accountName, setAccountName] = useState('Conta Corrente')
  const [accountType, setAccountType] = useState('checking')
  const [balance, setBalance] = useState('')
  const [interestRate, setInterestRate] = useState('3.3')
  const [validity, setValidity] = useState('3')
  const { addAccount, updateSettings } = useStore()

  const current = STEPS[step]
  const Icon = current.icon

  const handleNext = () => {
    if (step === 1 && accountName) {
      addAccount({ name: accountName, type: accountType, balance: parseFloat(balance) || 0, color: '#3b82f6', icon: '🏦', is_active: true })
    }
    if (step === 2) {
      updateSettings({ default_interest_rate: parseFloat(interestRate) || 3.3, default_payment_validity: parseInt(validity) || 3 })
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      updateSettings({ onboarding_completed: true })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Progress */}
        <div className="flex gap-1 p-4">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-blue-500' : 'bg-slate-100'}`} />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center pt-4 pb-6">
          <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${current.gradient} flex items-center justify-center shadow-lg`}>
            <Icon size={36} className="text-white" />
          </div>
        </div>

        <div className="px-8 pb-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">{current.title}</h2>
          <p className="text-sm text-slate-500 leading-relaxed">{current.desc}</p>
        </div>

        {/* Step-specific fields */}
        <div className="px-8 pb-6">
          {step === 1 && (
            <div className="flex flex-col gap-3 mt-4">
              <Input label="Nome da conta" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
              <Select label="Tipo" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="checking">Conta Corrente</option>
                <option value="savings">Poupança</option>
                <option value="cash">Dinheiro</option>
                <option value="investment">Investimento</option>
                <option value="credit_card">Cartão de Crédito</option>
              </Select>
              <Input label="Saldo inicial (R$)" type="number" placeholder="0,00" value={balance} onChange={(e) => setBalance(e.target.value)} />
            </div>
          )}
          {step === 2 && (
            <div className="flex flex-col gap-3 mt-4">
              <Input label="Taxa de juros padrão (% ao dia)" type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
              <Input label="Validade padrão do link (dias)" type="number" value={validity} onChange={(e) => setValidity(e.target.value)} />
            </div>
          )}
        </div>

        <div className="px-8 pb-8">
          <Button className="w-full" size="lg" onClick={handleNext}>
            {step === STEPS.length - 1 ? 'Começar!' : 'Próximo'}
            <ArrowRight size={16} />
          </Button>
          {step < STEPS.length - 1 && (
            <button onClick={() => updateSettings({ onboarding_completed: true })} className="mt-3 w-full text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
              Pular configuração
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
