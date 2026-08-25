import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.3 }}
            className={cn(
              'relative bg-bg-surface w-full rounded-t-2xl sm:rounded-card ring-1 ring-border shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-dark',
              sizes[size]
            )}
          >
            <div className="sticky top-0 bg-bg-surface border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-semibold text-fg text-sm">{title}</h2>
              <button onClick={onClose} className="p-1.5 rounded-btn hover:bg-bg-elevated text-fg-muted hover:text-fg transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
