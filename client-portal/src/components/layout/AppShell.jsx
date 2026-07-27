import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { ClientSidebar } from './ClientSidebar'
import { ClientTopBar } from './ClientTopBar'
import { useUIStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'

export const AppShell = () => {
  const { sidebarOpen } = useUIStore()
  const { user } = useUserStore()

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1117] text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <ClientSidebar />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'pl-64' : 'pl-20'
        }`}
      >
        <ClientTopBar />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
