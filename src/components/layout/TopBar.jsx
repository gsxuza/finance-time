import { useLocation } from 'react-router-dom'
import { NotificationCenter } from '@/components/NotificationCenter'

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

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between h-12 px-5 lg:px-7 bg-bg/80 backdrop-blur-md border-b border-border shrink-0">
      <p className="text-sm font-semibold text-fg lg:hidden">{title}</p>
      <p className="text-sm font-semibold text-fg hidden lg:block">{title}</p>
      <NotificationCenter />
    </div>
  )
}
