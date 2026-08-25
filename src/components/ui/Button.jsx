import { cn } from '@/lib/utils'

export function Button({ className, variant = 'default', size = 'md', children, ...props }) {
  const variants = {
    default: 'bg-fg text-bg font-semibold hover:bg-fg/90 active:bg-fg/80',
    outline: 'ring-border text-fg-secondary hover:bg-bg-elevated hover:text-fg hover:ring-border-strong',
    ghost: 'text-fg-secondary hover:bg-bg-hover hover:text-fg',
    danger: 'bg-danger/10 text-danger hover:bg-danger/20 ring-1 ring-danger/20',
    success: 'bg-success/10 text-success hover:bg-success/20 ring-1 ring-success/20',
    secondary: 'bg-bg-elevated text-fg-secondary hover:bg-bg-hover hover:text-fg',
    subtle: 'bg-bg-hover text-fg-secondary hover:bg-border-strong hover:text-fg',
  }
  const sizes = {
    xs: 'px-2.5 py-1 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
    icon: 'p-2',
    'icon-sm': 'p-1.5',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-btn font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer select-none',
        variant === 'outline' && 'ring-1',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
