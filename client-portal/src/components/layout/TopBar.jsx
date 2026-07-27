import React from 'react'
import { Bell, Search, User, Command, LogOut } from 'lucide-react'
import { useUserStore } from '../../stores/userStore'
import { useOrgStore } from '../../stores/orgStore'
import { useNotificationStore } from '../../features/notifications/stores/notificationStore'
import { NotificationCenter } from '../../features/notifications/NotificationCenter'

export const TopBar = () => {
  const { user, clearUser } = useUserStore()
  const { org } = useOrgStore()
  const { notifications, toggleOpen } = useNotificationStore()

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <header className="h-16 bg-[#12151E]/80 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Global Search Bar */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search leads, projects, invoices... (Cmd+K)"
            className="w-full bg-[#181C27] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            <Command className="w-3 h-3" /> K
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4 relative">
        {/* Notification Bell with Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={toggleOpen}
            className="relative w-9 h-9 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-[#12151E]" />
            )}
          </button>
          <NotificationCenter />
        </div>

        {/* User Profile Menu & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center font-medium text-xs">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200">
              {user?.displayName || 'Client User'}
            </span>
            <span className="text-[10px] text-slate-500">
              {user?.email || 'client@acme.com'}
            </span>
          </div>

          <button
            onClick={clearUser}
            title="Log Out"
            className="w-9 h-9 ml-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
