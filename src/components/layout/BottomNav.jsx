import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, MoreHorizontal,
  Wallet, PiggyBank, Landmark, Sparkles, BarChart3, Settings, X, TrendingUp,
  Target, CalendarRange, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MAIN_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/budgets', icon: PiggyBank, label: 'Orçamentos' },
]

const MORE_ITEMS = [
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/cashflow', icon: CalendarRange, label: 'Fluxo de Caixa' },
  { to: '/health-score', icon: Activity, label: 'Score' },
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
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.35 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-border rounded-t-2xl p-5 pb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-fg flex items-center justify-center">
                    <TrendingUp size={12} className="text-bg" strokeWidth={2.5} />
                  </div>
                  <span className="font-semibold text-sm text-fg">Finance Time</span>
                </div>
                <button onClick={() => setMoreOpen(false)} className="p-1.5 rounded-btn bg-bg-elevated text-fg-muted hover:text-fg transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                  <button
                    key={to}
                    onClick={() => { navigate(to); setMoreOpen(false) }}
                    className="flex flex-col items-center gap-2 p-3 rounded-card bg-bg-elevated hover:bg-bg-hover text-fg-muted hover:text-fg transition-all cursor-pointer"
                  >
                    <Icon size={18} />
                    <span className="text-2xs font-medium text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-surface border-t border-border px-1">
        <div className="flex items-center justify-around">
          {MAIN_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 py-3 px-3 text-2xs font-medium transition-colors',
                  isActive ? 'text-fg' : 'text-fg-muted'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="bottom-nav-dot"
                      className="absolute top-1.5 w-1 h-1 rounded-full bg-fg"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                  <Icon size={18} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 py-3 px-3 text-2xs font-medium text-fg-muted cursor-pointer"
          >
            <MoreHorizontal size={18} />
            <span>Mais</span>
          </button>
        </div>
      </nav>
    </>
  )
}
