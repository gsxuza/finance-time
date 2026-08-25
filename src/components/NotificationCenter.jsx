import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { computeNotifications } from '@/lib/notifications'
import { cn } from '@/lib/utils'

const SEVERITY_COLORS = {
  danger: 'text-danger bg-danger-muted',
  warning: 'text-warning bg-warning-muted',
  success: 'text-success bg-success-muted',
  info: 'text-blue bg-blue-muted',
}

const SEVERITY_DOT = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  success: 'bg-success',
  info: 'bg-blue',
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const { transactions, accounts, budgets, goals, recurringItems, readNotificationIds, markNotificationsRead } = useStore((s) => ({
    transactions: s.transactions,
    accounts: s.accounts,
    budgets: s.budgets,
    goals: s.goals,
    recurringItems: s.recurringItems,
    readNotificationIds: s.readNotificationIds,
    markNotificationsRead: s.markNotificationsRead,
  }))

  const notifications = useMemo(
    () => computeNotifications({ transactions, accounts, budgets, goals, recurringItems }),
    [transactions, accounts, budgets, goals, recurringItems]
  )

  const readSet = useMemo(() => new Set(readNotificationIds || []), [readNotificationIds])
  const unread = notifications.filter((n) => !readSet.has(n.id))
  const unreadCount = unread.length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setOpen((v) => !v)
  }

  const markAllRead = () => {
    markNotificationsRead(notifications.map((n) => n.id))
  }

  const handleClick = (n) => {
    markNotificationsRead([n.id])
    setOpen(false)
    navigate(n.route)
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className={cn(
          'relative flex items-center justify-center w-8 h-8 rounded-btn transition-colors cursor-pointer',
          open ? 'bg-bg-elevated text-fg' : 'text-fg-muted hover:text-fg hover:bg-bg-elevated'
        )}
        aria-label="Notificações"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-danger text-bg text-[10px] font-bold px-1 tabular-nums"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.2 }}
            className="absolute right-0 top-10 z-50 w-80 bg-bg-surface rounded-card ring-1 ring-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-fg">Notificações</p>
                {unreadCount > 0 && (
                  <span className="text-2xs font-bold px-1.5 py-0.5 rounded-full bg-danger text-bg tabular-nums">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-2xs text-fg-muted hover:text-fg transition-colors cursor-pointer px-2 py-1 rounded hover:bg-bg-elevated"
                  >
                    <CheckCheck size={11} />
                    Marcar lidas
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 text-fg-muted hover:text-fg transition-colors cursor-pointer rounded hover:bg-bg-elevated"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto scrollbar-dark">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <span className="text-3xl">🔔</span>
                  <div className="text-center">
                    <p className="text-sm font-medium text-fg">Tudo em dia!</p>
                    <p className="text-xs text-fg-muted mt-0.5">Sem alertas financeiros no momento.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {notifications.map((n) => {
                    const isRead = readSet.has(n.id)
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={cn(
                          'w-full text-left flex items-start gap-3 px-4 py-3.5 hover:bg-bg-elevated transition-colors cursor-pointer',
                          !isRead && 'bg-bg-elevated/50'
                        )}
                      >
                        {/* Severity dot */}
                        {!isRead && (
                          <div className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', SEVERITY_DOT[n.severity])} />
                        )}
                        {isRead && <div className="w-1.5 shrink-0" />}

                        <div className={cn('w-7 h-7 rounded-btn flex items-center justify-center text-base shrink-0', SEVERITY_COLORS[n.severity])}>
                          {n.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-xs font-semibold leading-snug', isRead ? 'text-fg-secondary' : 'text-fg')}>
                            {n.title}
                          </p>
                          <p className="text-2xs text-fg-muted mt-0.5 leading-relaxed">{n.body}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-border px-4 py-2.5">
                <p className="text-2xs text-fg-muted text-center">
                  {notifications.length} alerta{notifications.length !== 1 ? 's' : ''} ativo{notifications.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
