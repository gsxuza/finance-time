import { cn } from '@/lib/utils'

const variants = {
  default: 'bg-bg-elevated text-fg-secondary ring-1 ring-border',
  success: 'bg-success-muted text-success ring-1 ring-success/20',
  danger: 'bg-danger-muted text-danger ring-1 ring-danger/20',
  warning: 'bg-warning-muted text-warning ring-1 ring-warning/20',
  info: 'bg-blue-muted text-blue ring-1 ring-blue/20',
  violet: 'bg-violet-muted text-violet ring-1 ring-violet/20',
  income: 'bg-success-muted text-success ring-1 ring-success/20',
  expense: 'bg-danger-muted text-danger ring-1 ring-danger/20',
}

export function Badge({ variant = 'default', className, children }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-2xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pendente', variant: 'warning' },
    paid: { label: 'Pago', variant: 'success' },
    overdue: { label: 'Vencido', variant: 'danger' },
    cancelled: { label: 'Cancelado', variant: 'default' },
    active: { label: 'Ativo', variant: 'success' },
    inactive: { label: 'Inativo', variant: 'default' },
    connected: { label: 'Conectado', variant: 'success' },
    expired: { label: 'Expirado', variant: 'warning' },
    error: { label: 'Erro', variant: 'danger' },
    scheduled: { label: 'Agendado', variant: 'info' },
    sent: { label: 'Enviado', variant: 'success' },
    delivered: { label: 'Entregue', variant: 'success' },
    failed: { label: 'Falhou', variant: 'danger' },
  }
  const { label, variant } = map[status] || { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
