import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { Onboarding } from '@/components/Onboarding'
import { useStore } from '@/store/useStore'

export function Layout() {
  const onboarding_completed = useStore((s) => s.settings.onboarding_completed)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <Outlet />
      </main>
      <BottomNav />
      {!onboarding_completed && <Onboarding />}
    </div>
  )
}
