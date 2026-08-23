import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, MoreHorizontal,
  Wallet, PiggyBank, Landmark, Sparkles, BarChart3, Settings, X, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MAIN_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/budgets', icon: PiggyBank, label: 'Orçamentos' },
]

const MORE_ITEMS = [
  { to: '/open-finance', icon: Landmark, label: 'Open Finance' },
  { to: '/ai-insights', icon: Sparkles, label: 'IA & Insights' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-white rounded-t-3xl p-6 pb-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                  <TrendingUp size={13} className="text-white" />
                </div>
                <span className="font-bold text-gradient text-sm">Finance Time</span>
              </div>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl bg-slate-100 text-slate-500 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                <button
                  key={to}
                  onClick={() => { navigate(to); setMoreOpen(false) }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors cursor-pointer"
                >
                  <Icon size={20} />
                  <span className="text-xs font-medium leading-tight text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-2 pb-safe">
        <div className="flex items-center justify-around">
          {MAIN_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 py-2.5 px-3 text-xs font-medium transition-colors',
                  isActive ? 'text-blue-600' : 'text-slate-400'
                )
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2.5 px-3 text-xs font-medium text-slate-400 cursor-pointer"
          >
            <MoreHorizontal size={20} />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  )
}
