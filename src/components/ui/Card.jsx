import { cn } from '@/lib/utils'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('bg-white rounded-2xl shadow-sm border border-slate-100', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return <div className={cn('px-5 pt-5 pb-3', className)} {...props}>{children}</div>
}

export function CardContent({ className, children, ...props }) {
  return <div className={cn('px-5 pb-5', className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }) {
  return <h3 className={cn('text-sm font-semibold text-slate-500 uppercase tracking-wide', className)} {...props}>{children}</h3>
}
