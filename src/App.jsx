import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Accounts from '@/pages/Accounts'
import Budgets from '@/pages/Budgets'
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'unauthed') {
    return <Login onLogin={() => setStatus('authed')} />
  }

  return children
}

export default function App() {
  return (
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/open-finance" element={<OpenFinance />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  )
}
