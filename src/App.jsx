import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Accounts from '@/pages/Accounts'
import Budgets from '@/pages/Budgets'
import OpenFinance from '@/pages/OpenFinance'
import AIInsights from '@/pages/AIInsights'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

export default function App() {
  return (
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
  )
}
