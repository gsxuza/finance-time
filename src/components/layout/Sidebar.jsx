import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, Wallet, PiggyBank,
  Landmark, Sparkles, BarChart3, Settings,
  ChevronLeft, ChevronRight, TrendingUp, Target, CalendarRange
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transações' },
  { to: '/accounts', icon: Wallet, label: 'Contas' },
  { to: '/budgets', icon: PiggyBank, label: 'Orçamentos' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/cashflow', icon: CalendarRange, label: 'Fluxo de Caixa' },
  { to: '/open-finance', icon: Landmark, label: 'Open Finance' },
  { to: '/ai-insights', icon: Sparkles, label: 'IA & Insights' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col bg-bg-surface border-r border-border h-screen sticky top-0 shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 px-4 h-14 border-b border-border shrink-0', collapsed && 'justify-center px-0')}>
        <div className="w-7 h-7 rounded-lg bg-fg flex items-center justify-center shrink-0">
          <TrendingUp size={14} className="text-bg" strokeWidth={2.5} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="font-semibold text-sm text-fg whitespace-nowrap overflow-hidden"
            >
              Finance Time
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2.5 mx-2 my-0.5 px-3 py-2 rounded-btn text-sm transition-all duration-150 group',
                collapsed ? 'justify-center px-0 mx-1' : '',
                isActive
                  ? 'bg-bg-elevated text-fg'
                  : 'text-fg-muted hover:bg-bg-hover hover:text-fg-secondary'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute inset-0 bg-bg-elevated rounded-btn ring-1 ring-border"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <Icon size={16} className={cn('relative z-10 shrink-0', isActive ? 'text-fg' : 'text-fg-muted group-hover:text-fg-secondary')} />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="relative z-10 whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-11 border-t border-border text-fg-muted hover:text-fg-secondary hover:bg-bg-hover transition-colors cursor-pointer shrink-0"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  )
}
