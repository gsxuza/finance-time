import { cn } from '@/lib/utils'

const baseField = [
  'w-full px-3 py-2.5 rounded-input text-sm text-fg placeholder-fg-muted',
  'bg-bg-elevated ring-1 ring-border',
  'focus:outline-none focus:ring-1 focus:ring-border-strong focus:bg-bg-overlay',
  'transition-all duration-150',
].join(' ')

export function Input({ className, label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-fg-secondary">{label}</label>}
      <input
        className={cn(baseField, error && 'ring-danger/50 focus:ring-danger/70', className)}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

export function Select({ className, label, error, children, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-fg-secondary">{label}</label>}
      <select
        className={cn(baseField, 'bg-bg-elevated cursor-pointer', error && 'ring-danger/50', className)}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}

export function Textarea({ className, label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-medium text-fg-secondary">{label}</label>}
      <textarea
        className={cn(baseField, 'resize-none', error && 'ring-danger/50', className)}
        rows={3}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
