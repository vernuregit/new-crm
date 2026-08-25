import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Folder,
  Receipt,
  FileText,
  Headphones,
  User,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'

const NAV_ITEMS = [
  { name: 'Overview', path: '/portal', icon: Home, end: true },
  { name: 'My Projects', path: '/portal/projects', icon: Folder },
  { name: 'Invoices', path: '/portal/invoices', icon: Receipt },
  { name: 'Billing', path: '/portal/billing', icon: CreditCard },
  { name: 'Documents', path: '/portal/files', icon: FileText },
  { name: 'Support', path: '/portal/support', icon: Headphones },
  { name: 'My Profile', path: '/portal/profile', icon: User },
]

export const ClientSidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, userDoc, clearUser } = useUserStore()

  const companyName =
    userDoc?.companyName ||
    userDoc?.organization ||
    user?.companyName ||
    'Client Workspace'


  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col leading-tight min-w-0">
              <span className="font-bold text-slate-900 dark:text-white text-xs tracking-wider uppercase truncate">
                CLIENT PORTAL
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-400 font-normal truncate mt-0.5">
                {companyName}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-slate-200/60 dark:border-slate-700/60"
        >
          {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50/90 text-blue-600 dark:bg-blue-600/15 dark:text-blue-400 shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                } ${!sidebarOpen ? 'justify-center px-2' : ''}`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <button
          onClick={() => clearUser()}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer ${
            !sidebarOpen ? 'justify-center px-2' : ''
          }`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}


