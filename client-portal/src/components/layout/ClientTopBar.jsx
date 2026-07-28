import React from 'react'
import { Link } from 'react-router-dom'
import { Bell, ShieldCheck, User, Sun, Moon } from 'lucide-react'
import { useUserStore } from '../../stores/userStore'
import { useUIStore } from '../../stores/uiStore'

export const ClientTopBar = () => {
  const { user } = useUserStore()
  const { theme, toggleTheme } = useUIStore()

  return (
    <header className="h-16 bg-white/90 dark:bg-[#0E1420]/90 backdrop-blur-md border-b border-slate-200 dark:border-emerald-900/40 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Security badge */}
      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="w-4 h-4" />
        <span className="font-medium hidden sm:block">
          Secure Client Environment — <span className="text-slate-700 dark:text-slate-300">Acme Corp</span>
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Sun/Moon Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-emerald-900/20 hover:bg-slate-200 dark:hover:bg-emerald-900/40 text-slate-600 dark:text-emerald-400 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-emerald-900/40"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300 -rotate-12 hover:rotate-0" />
          )}
        </button>

        {/* Notification Bell */}
        <button className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-emerald-900/20 hover:bg-slate-200 dark:hover:bg-emerald-900/40 text-slate-600 dark:text-emerald-400 flex items-center justify-center transition-colors border border-slate-200 dark:border-emerald-900/40 cursor-pointer">
          <Bell className="w-4 h-4" />
        </button>

        {/* User Profile */}
        <Link
          to="/portal/profile"
          className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-emerald-900/40 hover:opacity-80 transition-opacity cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-medium text-xs group-hover:scale-105 transition-transform">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {user?.displayName || 'Client User'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Client Portal
            </span>
          </div>
        </Link>
      </div>
    </header>
  )
}

