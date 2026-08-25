import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { TopBar } from './TopBar'
import { Onboarding } from '@/components/Onboarding'
import { useStore } from '@/store/useStore'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function Layout() {
  const onboarding_completed = useStore((s) => s.settings.onboarding_completed)
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-dark pb-20 lg:pb-0">
        <TopBar />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      {!onboarding_completed && <Onboarding />}
    </div>
  )
}
