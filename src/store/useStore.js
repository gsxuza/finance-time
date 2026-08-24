import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, DEFAULT_CATEGORIES } from '@/lib/utils'

const initialState = {
  accounts: [],
  transactions: [],
  budgets: [],
  categories: DEFAULT_CATEGORIES,
  bankConnections: [],
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
        const m = new Date().toISOString().slice(0, 7)
        return transactions
          .filter((t) => t.type === 'income' && t.date?.startsWith(m))
          .reduce((sum, t) => sum + t.amount, 0)
      },
      getMonthlyExpenses: () => {
        const { transactions } = get()
        const m = new Date().toISOString().slice(0, 7)
        return transactions
          .filter((t) => t.type === 'expense' && t.date?.startsWith(m))
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
      name: 'finance-time-v4',
      version: 1,
    }
  )
)
