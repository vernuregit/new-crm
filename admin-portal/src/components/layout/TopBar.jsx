import React from 'react'
import { Bell, Search, User, Command, LogOut, Sun, Moon } from 'lucide-react'
import { useUserStore } from '../../stores/userStore'
import { useOrgStore } from '../../stores/orgStore'
import { useUIStore } from '../../stores/uiStore'
import { useNotificationStore } from '../../features/notifications/stores/notificationStore'
import { NotificationCenter } from '../../features/notifications/NotificationCenter'

export const TopBar = () => {
  const { user, clearUser } = useUserStore()
  const { org } = useOrgStore()
  const { theme, toggleTheme } = useUIStore()
  const { notifications, toggleOpen } = useNotificationStore()

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <header className="h-16 bg-white/80 dark:bg-[#12151E]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Global Search Bar */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search leads, projects, invoices... (Cmd+K)"
            className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
            <Command className="w-3 h-3" /> K
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 relative">
        {/* Sun/Moon Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-slate-700/50"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300 -rotate-12 hover:rotate-0" />
          )}
        </button>

        {/* Notification Bell with Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={toggleOpen}
            className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors border border-slate-200 dark:border-slate-700/50 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-[#12151E]" />
            )}
          </button>
          <NotificationCenter />
        </div>

        {/* User Profile Menu & Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-medium text-xs">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {user?.displayName || 'Demo Executive'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              {user?.email || 'admin@businessos.io'}
            </span>
          </div>

          <button
            onClick={clearUser}
            title="Log Out"
            className="w-9 h-9 ml-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

