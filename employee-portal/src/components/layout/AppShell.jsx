import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { EmployeeSidebar } from './EmployeeSidebar'
import { EmployeeTopBar } from './EmployeeTopBar'
import { useUIStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'
import { useWellnessNotifications } from '../../features/wellness/hooks/useWellnessNotifications'
import { useAutoClockOutAfterWorkday } from '../../features/team/hooks/useAutoClockOutAfterWorkday'

export const AppShell = () => {
  const { sidebarOpen } = useUIStore()
  const { user } = useUserStore()

  // Mount wellness notification timers app-wide
  useWellnessNotifications()
  // Auto clock-out after 8h worked (runs on all authenticated pages)
  useAutoClockOutAfterWorkday()

  // Auth Guard: Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1117] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <EmployeeSidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'pl-64' : 'pl-20'
        }`}
      >
        <EmployeeTopBar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
