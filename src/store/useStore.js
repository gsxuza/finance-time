import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, DEFAULT_CATEGORIES, getDaysLate, calcInterest } from '@/lib/utils'
import { addMonths, subMonths, format } from 'date-fns'

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

const SEED_BANK_CONNECTIONS = [
  { id: 'bc-1', bank_name: 'Nubank', bank_code: 'nubank', account_type: 'checking', account_number: '****1234', status: 'connected', last_sync: new Date(Date.now() - 3600000).toISOString(), consent_expires: format(addMonths(today, 2), 'yyyy-MM-dd'), balance: 3200.5, auto_sync: true },
  { id: 'bc-2', bank_name: 'Banco Inter', bank_code: 'inter', account_type: 'savings', account_number: '****5678', status: 'expired', last_sync: new Date(Date.now() - 86400000 * 5).toISOString(), consent_expires: format(subMonths(today, 1), 'yyyy-MM-dd'), balance: 5000, auto_sync: false },
]

const initialState = {
  accounts: SEED_ACCOUNTS,
  transactions: SEED_TRANSACTIONS,
  budgets: SEED_BUDGETS,
  categories: DEFAULT_CATEGORIES,
  bankConnections: SEED_BANK_CONNECTIONS,
  settings: {
    currency: 'BRL',
    language: 'pt-BR',
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
    }),
    {
      name: 'finance-time-store',
      version: 2,
    }
  )
)
