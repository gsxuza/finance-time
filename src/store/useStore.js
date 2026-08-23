import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, generateLinkCode, DEFAULT_CATEGORIES, getDaysLate, calcInterest } from '@/lib/utils'
import { addMonths, subMonths, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

const today = new Date()
const thisMonth = format(today, 'yyyy-MM')

const SEED_ACCOUNTS = [
  { id: 'acc-1', name: 'Conta Corrente', type: 'checking', balance: 5420.5, color: '#3b82f6', icon: '🏦', is_active: true },
  { id: 'acc-2', name: 'Poupança', type: 'savings', balance: 12800.0, color: '#10b981', icon: '🐷', is_active: true },
  { id: 'acc-3', name: 'Cartão Nubank', type: 'credit_card', balance: -1250.3, color: '#8b5cf6', icon: '💳', is_active: true, credit_limit: 8000 },
]

const SEED_TRANSACTIONS = [
  { id: 'tx-1', type: 'income', amount: 8500, category: 'Salário', description: 'Salário Junho', date: `${thisMonth}-05`, account_id: 'acc-1', is_recurring: true, recurring_frequency: 'monthly' },
  { id: 'tx-2', type: 'expense', amount: 1800, category: 'Moradia', description: 'Aluguel', date: `${thisMonth}-10`, account_id: 'acc-1', is_recurring: true, recurring_frequency: 'monthly' },
  { id: 'tx-3', type: 'expense', amount: 350, category: 'Alimentação', description: 'Supermercado Pão de Açúcar', date: `${thisMonth}-12`, account_id: 'acc-1' },
  { id: 'tx-4', type: 'expense', amount: 89.9, category: 'Transporte', description: 'Uber', date: `${thisMonth}-13`, account_id: 'acc-3' },
  { id: 'tx-5', type: 'expense', amount: 250, category: 'Saúde', description: 'Consulta médica', date: `${thisMonth}-14`, account_id: 'acc-1' },
  { id: 'tx-6', type: 'income', amount: 1200, category: 'Freelance', description: 'Projeto design site', date: `${thisMonth}-15`, account_id: 'acc-1' },
  { id: 'tx-7', type: 'expense', amount: 189, category: 'Lazer', description: 'Netflix, Spotify, Disney+', date: `${thisMonth}-16`, account_id: 'acc-3' },
  { id: 'tx-8', type: 'expense', amount: 420, category: 'Restaurante', description: 'Jantar aniversário', date: `${thisMonth}-17`, account_id: 'acc-3' },
  { id: 'tx-9', type: 'expense', amount: 79.9, category: 'Tecnologia', description: 'iCloud 200GB', date: `${thisMonth}-18`, account_id: 'acc-3' },
  { id: 'tx-10', type: 'expense', amount: 310, category: 'Educação', description: 'Curso online', date: `${thisMonth}-19`, account_id: 'acc-1' },
]

const SEED_BUDGETS = [
  { id: 'bud-1', category: 'Alimentação', amount: 800, period: 'monthly', start_date: `${thisMonth}-01`, alert_threshold: 80, is_active: true },
  { id: 'bud-2', category: 'Transporte', amount: 400, period: 'monthly', start_date: `${thisMonth}-01`, alert_threshold: 80, is_active: true },
  { id: 'bud-3', category: 'Lazer', amount: 500, period: 'monthly', start_date: `${thisMonth}-01`, alert_threshold: 80, is_active: true },
  { id: 'bud-4', category: 'Restaurante', amount: 600, period: 'monthly', start_date: `${thisMonth}-01`, alert_threshold: 80, is_active: true },
]

const SEED_PATIENTS = [
  { id: 'pat-1', name: 'Ana Clara Silva', phone: '11987654321', email: 'ana@email.com', notes: 'Paciente desde 2022', status: 'active', total_paid: 3200, pending_amount: 350 },
  { id: 'pat-2', name: 'Bruno Mendes', phone: '11976543210', email: 'bruno@email.com', notes: '', status: 'active', total_paid: 1500, pending_amount: 0 },
  { id: 'pat-3', name: 'Carla Souza', phone: '21965432109', email: 'carla@email.com', notes: 'Plano mensal', status: 'active', total_paid: 4800, pending_amount: 700 },
  { id: 'pat-4', name: 'Daniel Costa', phone: '31954321098', email: '', notes: '', status: 'inactive', total_paid: 600, pending_amount: 0 },
]

const SEED_PAYMENT_LINKS = [
  { id: 'pl-1', patient_id: 'pat-1', patient_name: 'Ana Clara Silva', amount: 350, due_date: format(addMonths(today, 1), 'yyyy-MM-dd'), status: 'pending', interest_rate: 3.3, message: 'Olá {nome}! Seu pagamento de {valor} vence em {data}.', link_code: 'ANA001' },
  { id: 'pl-2', patient_id: 'pat-3', patient_name: 'Carla Souza', amount: 700, due_date: format(subMonths(today, 1), 'yyyy-MM-dd'), status: 'overdue', interest_rate: 3.3, message: 'Olá {nome}! Seu pagamento de {valor} está vencido.', link_code: 'CAR001' },
  { id: 'pl-3', patient_id: 'pat-2', patient_name: 'Bruno Mendes', amount: 500, due_date: format(subMonths(today, 2), 'yyyy-MM-dd'), status: 'paid', interest_rate: 3.3, message: '', link_code: 'BRU001', paid_date: format(subMonths(today, 2), 'yyyy-MM-dd'), paid_amount: 500 },
]

const SEED_BANK_CONNECTIONS = [
  { id: 'bc-1', bank_name: 'Nubank', bank_code: 'nubank', account_type: 'checking', account_number: '****1234', status: 'connected', last_sync: new Date(Date.now() - 3600000).toISOString(), consent_expires: format(addMonths(today, 2), 'yyyy-MM-dd'), balance: 3200.5, auto_sync: true },
  { id: 'bc-2', bank_name: 'Banco Inter', bank_code: 'inter', account_type: 'savings', account_number: '****5678', status: 'expired', last_sync: new Date(Date.now() - 86400000 * 5).toISOString(), consent_expires: format(subMonths(today, 1), 'yyyy-MM-dd'), balance: 5000, auto_sync: false },
]

const SEED_SCHEDULED = [
  { id: 'sp-1', payment_link_id: 'pl-1', patient_id: 'pat-1', scheduled_date: format(addMonths(today, 0), "yyyy-MM-dd'T'09:00:00"), status: 'scheduled', message_template: 'Olá {nome}! Lembrete de pagamento de {valor} com vencimento em {data}. Acesse: {link}', retry_count: 0 },
]

const initialState = {
  accounts: SEED_ACCOUNTS,
  transactions: SEED_TRANSACTIONS,
  budgets: SEED_BUDGETS,
  categories: DEFAULT_CATEGORIES,
  patients: SEED_PATIENTS,
  paymentLinks: SEED_PAYMENT_LINKS,
  scheduledPayments: SEED_SCHEDULED,
  paymentConfirmations: [],
  bankConnections: SEED_BANK_CONNECTIONS,
  settings: {
    currency: 'BRL',
    language: 'pt-BR',
    default_interest_rate: 3.3,
    default_payment_validity: 3,
    default_payment_message: 'Olá {nome}! Seu pagamento de {valor} vence em {data}. Acesse o link para pagar: {link}',
    notifications_enabled: true,
    biometric_enabled: false,
    onboarding_completed: false,
  },
}

export const useStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      // Accounts
      addAccount: (data) => set((s) => ({ accounts: [...s.accounts, { id: generateId(), ...data }] })),
      updateAccount: (id, data) => set((s) => ({ accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)) })),
      deleteAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      // Transactions
      addTransaction: (data) => set((s) => {
        const tx = { id: generateId(), ...data }
        const accounts = s.accounts.map((a) => {
          if (a.id !== data.account_id) return a
          const delta = data.type === 'income' ? data.amount : -data.amount
          return { ...a, balance: a.balance + delta }
        })
        return { transactions: [...s.transactions, tx], accounts }
      }),
      updateTransaction: (id, data) => set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...data } : t)) })),
      deleteTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      // Budgets
      addBudget: (data) => set((s) => ({ budgets: [...s.budgets, { id: generateId(), ...data }] })),
      updateBudget: (id, data) => set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...data } : b)) })),
      deleteBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      // Patients
      addPatient: (data) => set((s) => ({ patients: [...s.patients, { id: generateId(), total_paid: 0, pending_amount: 0, ...data }] })),
      updatePatient: (id, data) => set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...data } : p)) })),
      deletePatient: (id) => set((s) => ({ patients: s.patients.filter((p) => p.id !== id) })),

      // Payment Links
      addPaymentLink: (data) => set((s) => {
        const link = { id: generateId(), link_code: generateLinkCode(), status: 'pending', ...data }
        const patients = s.patients.map((p) =>
          p.id === data.patient_id ? { ...p, pending_amount: (p.pending_amount || 0) + data.amount } : p
        )
        return { paymentLinks: [...s.paymentLinks, link], patients }
      }),
      updatePaymentLink: (id, data) => set((s) => ({ paymentLinks: s.paymentLinks.map((l) => (l.id === id ? { ...l, ...data } : l)) })),
      markLinkPaid: (id, paidAmount) => set((s) => {
        const link = s.paymentLinks.find((l) => l.id === id)
        if (!link) return {}
        const confirmation = {
          id: generateId(),
          payment_link_id: id,
          confirmation_source: 'manual',
          confirmed_amount: paidAmount,
          confirmed_date: new Date().toISOString(),
        }
        const patients = s.patients.map((p) => {
          if (p.id !== link.patient_id) return p
          return { ...p, total_paid: p.total_paid + paidAmount, pending_amount: Math.max(0, p.pending_amount - link.amount) }
        })
        const accounts = s.accounts.map((a) => {
          if (!a.is_active || a.type === 'credit_card') return a
          return { ...a, balance: a.balance + paidAmount }
        })
        const tx = {
          id: generateId(),
          type: 'income',
          amount: paidAmount,
          category: 'Outros Rendimentos',
          description: `Pagamento - ${link.patient_name}`,
          date: format(today, 'yyyy-MM-dd'),
          account_id: s.accounts.find((a) => a.is_active && a.type !== 'credit_card')?.id || 'acc-1',
        }
        return {
          paymentLinks: s.paymentLinks.map((l) => l.id === id ? { ...l, status: 'paid', paid_date: format(today, 'yyyy-MM-dd'), paid_amount: paidAmount } : l),
          paymentConfirmations: [...s.paymentConfirmations, confirmation],
          patients,
          accounts,
          transactions: [...s.transactions, tx],
        }
      }),
      deletePaymentLink: (id) => set((s) => ({ paymentLinks: s.paymentLinks.filter((l) => l.id !== id) })),

      // Scheduled Payments
      addScheduledPayment: (data) => set((s) => ({ scheduledPayments: [...s.scheduledPayments, { id: generateId(), retry_count: 0, status: 'scheduled', ...data }] })),
      updateScheduledPayment: (id, data) => set((s) => ({ scheduledPayments: s.scheduledPayments.map((sp) => (sp.id === id ? { ...sp, ...data } : sp)) })),
      deleteScheduledPayment: (id) => set((s) => ({ scheduledPayments: s.scheduledPayments.filter((sp) => sp.id !== id) })),

      // Bank Connections
      addBankConnection: (data) => set((s) => ({ bankConnections: [...s.bankConnections, { id: generateId(), status: 'connected', auto_sync: true, last_sync: new Date().toISOString(), ...data }] })),
      updateBankConnection: (id, data) => set((s) => ({ bankConnections: s.bankConnections.map((bc) => (bc.id === id ? { ...bc, ...data } : bc)) })),
      deleteBankConnection: (id) => set((s) => ({ bankConnections: s.bankConnections.filter((bc) => bc.id !== id) })),

      // Settings
      updateSettings: (data) => set((s) => ({ settings: { ...s.settings, ...data } })),

      // Selectors
      getTotalBalance: () => {
        const { accounts } = get()
        return accounts.filter((a) => a.is_active).reduce((sum, a) => sum + a.balance, 0)
      },
      getMonthlyIncome: () => {
        const { transactions } = get()
        return transactions
          .filter((t) => t.type === 'income' && t.date?.startsWith(thisMonth))
          .reduce((sum, t) => sum + t.amount, 0)
      },
      getMonthlyExpenses: () => {
        const { transactions } = get()
        return transactions
          .filter((t) => t.type === 'expense' && t.date?.startsWith(thisMonth))
          .reduce((sum, t) => sum + t.amount, 0)
      },
      getBudgetSpent: (category, period, startDate) => {
        const { transactions } = get()
        return transactions
          .filter((t) => t.type === 'expense' && t.category === category && t.date >= startDate)
          .reduce((sum, t) => sum + t.amount, 0)
      },
      getCurrentLinkAmount: (link) => {
        const daysLate = getDaysLate(link.due_date)
        if (link.status !== 'pending' && link.status !== 'overdue') return link.amount
        return calcInterest(link.amount, link.interest_rate || 0, daysLate)
      },
    }),
    {
      name: 'finance-time-store',
      version: 1,
    }
  )
)
