import { useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { NotificationCenter } from '@/components/NotificationCenter'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/transactions': 'Transações',
  '/accounts': 'Contas',
  '/budgets': 'Orçamentos',
  '/goals': 'Metas',
  '/cashflow': 'Fluxo de Caixa',
  '/health-score': 'Score de Saúde',
  '/open-finance': 'Open Finance',
  '/ai-insights': 'IA & Insights',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
}

export function TopBar() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] || ''
  const valuesHidden = useStore((s) => s.valuesHidden)
  const toggleValuesHidden = useStore((s) => s.toggleValuesHidden)

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between h-12 px-5 lg:px-7 bg-bg/80 backdrop-blur-md border-b border-border shrink-0">
      <p className="text-sm font-semibold text-fg lg:hidden">{title}</p>
      <p className="text-sm font-semibold text-fg hidden lg:block">{title}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleValuesHidden}
          className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-btn transition-colors cursor-pointer',
            valuesHidden ? 'bg-bg-elevated text-fg' : 'text-fg-muted hover:text-fg hover:bg-bg-elevated'
          )}
          aria-label={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
          title={valuesHidden ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {valuesHidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <NotificationCenter />
      </div>
    </div>
  )
}
