import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId, currentMonth, countsAsFlow, markTransfers, DEFAULT_CATEGORIES } from '@/lib/utils'

const initialState = {
  accounts: [],
  transactions: [],
  budgets: [],
  goals: [],
  recurringItems: [],
  readNotificationIds: [],
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

      // Notifications
      markNotificationsRead: (ids) => set((s) => ({
        readNotificationIds: [...new Set([...(s.readNotificationIds || []), ...ids])],
      })),
      clearReadNotifications: () => set({ readNotificationIds: [] }),

      // Goals
      addGoal: (data) => set((s) => ({ goals: [...(s.goals || []), { id: generateId(), created_at: new Date().toISOString(), ...data }] })),
      updateGoal: (id, data) => set((s) => ({ goals: (s.goals || []).map((g) => (g.id === id ? { ...g, ...data } : g)) })),
      deleteGoal: (id) => set((s) => ({ goals: (s.goals || []).filter((g) => g.id !== id) })),

      // Recurring items (cash flow projection)
      addRecurringItem: (data) => set((s) => ({ recurringItems: [...(s.recurringItems || []), { id: generateId(), is_active: true, ...data }] })),
      updateRecurringItem: (id, data) => set((s) => ({ recurringItems: (s.recurringItems || []).map((r) => (r.id === id ? { ...r, ...data } : r)) })),
      deleteRecurringItem: (id) => set((s) => ({ recurringItems: (s.recurringItems || []).filter((r) => r.id !== id) })),

      // Bank Connections
      addBankConnection: (data) => set((s) => ({ bankConnections: [...s.bankConnections, { id: generateId(), status: 'connected', auto_sync: true, last_sync: new Date().toISOString(), ...data }] })),
      updateBankConnection: (id, data) => set((s) => ({ bankConnections: s.bankConnections.map((bc) => (bc.id === id ? { ...bc, ...data } : bc)) })),
      deleteBankConnection: (id) => set((s) => ({ bankConnections: s.bankConnections.filter((bc) => bc.id !== id) })),

      // Import transactions from Pluggy (deduplicates by pluggy_id, updates account balances)
      importPluggySync: ({ transactions: newTxs, accountUpdates }) => set((s) => {
        const incomingById = new Map(newTxs.filter((t) => t.pluggy_id).map((t) => [t.pluggy_id, t]))
        const existingPluggyIds = new Set(s.transactions.filter((t) => t.pluggy_id).map((t) => t.pluggy_id))
        const toAdd = newTxs.filter((t) => !existingPluggyIds.has(t.pluggy_id))

        // Re-classify transactions already stored. Without this a re-sync could
        // never repair them: they were imported before Pluggy's category was
        // read, so a wrongly counted card payment would stay wrong forever.
        // Only the classification is refreshed — amount, date, description and
        // any category the user edited are left alone.
        const existing = s.transactions.map((t) => {
          const fresh = t.pluggy_id && incomingById.get(t.pluggy_id)
          if (!fresh) return t
          if (t.is_transfer === fresh.is_transfer && t.pluggy_category_id === fresh.pluggy_category_id) return t
          return {
            ...t,
            is_transfer: fresh.is_transfer,
            pluggy_category: fresh.pluggy_category,
            pluggy_category_id: fresh.pluggy_category_id,
            category: fresh.is_transfer ? fresh.category : t.category,
          }
        })

        let accounts = [...s.accounts]
        // Apply account balance updates from Pluggy
        for (const upd of accountUpdates) {
          const existing = accounts.find((a) => a.pluggy_account_id === upd.pluggy_account_id)
          if (existing) {
            accounts = accounts.map((a) => a.pluggy_account_id === upd.pluggy_account_id ? { ...a, balance: upd.balance, is_active: true } : a)
          } else {
            accounts = [...accounts, { id: generateId(), pluggy_account_id: upd.pluggy_account_id, name: upd.name, type: upd.type, balance: upd.balance, icon: upd.icon, is_active: true, currency: 'BRL' }]
          }
        }

        // Now link each new transaction to the correct local account_id
        const finalTxs = toAdd.map((t) => {
          const acct = accounts.find((a) => a.pluggy_account_id === t.pluggy_account_id)
          return { id: generateId(), ...t, account_id: acct?.id || '' }
        })

        return { transactions: [...existing, ...finalTxs], accounts }
      }),

      // Settings
      updateSettings: (data) => set((s) => ({ settings: { ...s.settings, ...data } })),

      // Selectors
      getTotalBalance: () => {
        const { accounts } = get()
        return accounts.filter((a) => a.is_active).reduce((sum, a) => sum + a.balance, 0)
      },
      getMonthlyIncome: () => {
        const { transactions } = get()
        const m = currentMonth()
        return transactions
          .filter((t) => t.type === 'income' && countsAsFlow(t) && t.date?.startsWith(m))
          .reduce((sum, t) => sum + (t.amount || 0), 0)
      },
      getMonthlyExpenses: () => {
        const { transactions } = get()
        const m = currentMonth()
        return transactions
          .filter((t) => t.type === 'expense' && countsAsFlow(t) && t.date?.startsWith(m))
          .reduce((sum, t) => sum + (t.amount || 0), 0)
      },
      getBudgetSpent: (category, period, startDate) => {
        const { transactions } = get()
        return transactions
          .filter((t) => t.type === 'expense' && countsAsFlow(t) && t.category === category && t.date >= startDate)
          .reduce((sum, t) => sum + t.amount, 0)
      },
    }),
    {
      name: 'finance-time-v4',
      version: 2,
      // v2 introduced is_transfer, so credit card bill payments already stored
      // need flagging — they were imported before the distinction existed.
      migrate: (state, from) => {
        if (!state || from >= 2) return state
        return { ...state, transactions: markTransfers(state.transactions, state.accounts) }
      },
    }
  )
)
