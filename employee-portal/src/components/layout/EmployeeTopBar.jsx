import React from 'react'
import { Bell, UserCheck, User, Search, Sun, Moon } from 'lucide-react'
import { useUserStore } from '../../stores/userStore'
import { useUIStore } from '../../stores/uiStore'

export const EmployeeTopBar = () => {
  const { user } = useUserStore()
  const { theme, toggleTheme } = useUIStore()

  return (
    <header className="h-16 bg-white/90 dark:bg-[#12151E]/90 backdrop-blur-md border-b border-slate-200 dark:border-purple-900/40 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Staff Environment Badge & Search */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
          <UserCheck className="w-4 h-4" />
          <span className="font-medium hidden sm:block">
            Staff Workspace
          </span>
        </div>

        <div className="relative w-64 hidden md:block">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks, docs..."
            className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Sun/Moon Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-purple-900/20 hover:bg-slate-200 dark:hover:bg-purple-900/40 text-slate-600 dark:text-purple-400 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-purple-900/40"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300 -rotate-12 hover:rotate-0" />
          )}
        </button>

        {/* Notification Bell */}
        <button className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-purple-900/20 hover:bg-slate-200 dark:hover:bg-purple-900/40 text-slate-600 dark:text-purple-400 flex items-center justify-center transition-colors border border-slate-200 dark:border-purple-900/40 cursor-pointer">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-purple-900/40">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-medium text-xs">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {user?.displayName || 'Employee Staff'}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
              Staff Member
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

