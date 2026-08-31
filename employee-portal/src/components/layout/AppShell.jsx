import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { EmployeeSidebar } from './EmployeeSidebar'
import { EmployeeTopBar } from './EmployeeTopBar'
import { useUIStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'
import { getUserDoc } from '../../shared/services/authService'
import { useWellnessNotifications } from '../../features/wellness/hooks/useWellnessNotifications'
import { useAutoClockOutAfterWorkday } from '../../features/team/hooks/useAutoClockOutAfterWorkday'
import { useAnnouncementBrowserAlerts } from '../../features/announcements/hooks/useAnnouncementBrowserAlerts'

export const AppShell = () => {
  const { sidebarOpen } = useUIStore()
  const { user, claims, setUser } = useUserStore()

  useAnnouncementBrowserAlerts(user?.uid)

  useEffect(() => {
    if (!user?.uid) return
    let cancelled = false
    getUserDoc(user.uid).then((docData) => {
      if (!cancelled && docData) setUser(user, docData, claims)
    })
    return () => {
      cancelled = true
    }
    // Refresh profile once per signed-in user so the sidebar shows the current job role.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid])

  useWellnessNotifications()
  useAutoClockOutAfterWorkday()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-canvas text-fg flex flex-col transition-colors">
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
