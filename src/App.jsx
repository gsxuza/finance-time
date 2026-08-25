import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { useNeonSync } from '@/hooks/useNeonSync'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Accounts from '@/pages/Accounts'
import Budgets from '@/pages/Budgets'
import Goals from '@/pages/Goals'
import CashFlow from '@/pages/CashFlow'
import OpenFinance from '@/pages/OpenFinance'
import AIInsights from '@/pages/AIInsights'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

function AuthGate({ children }) {
  const [status, setStatus] = useState('checking') // checking | authed | unauthed

  useEffect(() => {
    const token = localStorage.getItem('ft_token')
    if (!token) { setStatus('unauthed'); return }
    fetch('/api/auth/verify', { headers: { 'x-auth-token': token } })
      .then((r) => r.json())
      .then((d) => setStatus(d.ok ? 'authed' : 'unauthed'))
      .catch(() => setStatus(token ? 'authed' : 'unauthed'))
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-8 h-8 border-2 border-border border-t-fg-secondary rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'unauthed') {
    return <Login onLogin={() => setStatus('authed')} />
  }

  return children
}

function SyncProvider({ children }) {
  useNeonSync()
  return children
}

export default function App() {
  return (
    <AuthGate>
      <SyncProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/cashflow" element={<CashFlow />} />
            <Route path="/open-finance" element={<OpenFinance />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </SyncProvider>
    </AuthGate>
  )
}
