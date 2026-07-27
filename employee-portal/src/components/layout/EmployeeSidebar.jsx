import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCheck
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', path: '/projects/list', icon: FolderKanban },
  { name: 'Sprint Tasks', path: '/tasks', icon: Briefcase },
  { name: 'Time Tracking', path: '/time', icon: Clock },
  { name: 'Team Directory', path: '/directory', icon: Users },
  { name: 'Attendance', path: '/attendance', icon: CheckCircle2 },
  { name: 'Leave & PTO', path: '/team/leave', icon: Calendar },
  { name: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
]

export const EmployeeSidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, clearUser } = useUserStore()

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-[#12151E] border-r border-slate-200 dark:border-purple-900/40 transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-purple-900/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-600/30 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-wide leading-none">
                STAFF PORTAL
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium tracking-wider mt-1 uppercase">
                EMPLOYEE MODE
              </span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-purple-900/30 hover:bg-slate-200 dark:hover:bg-purple-900/60 text-slate-500 dark:text-purple-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-600/15 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Footer — User Info + Logout */}
      <div className="p-3 border-t border-slate-200 dark:border-purple-900/40 space-y-2">
        {/* User badge */}
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-purple-900/20 border border-slate-200 dark:border-purple-900/40 ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-600/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 border border-purple-200 dark:border-purple-500/30">
            {user?.displayName?.charAt(0)?.toUpperCase() || 'E'}
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.displayName || 'Employee Staff'}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border mt-0.5 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 truncate">
                Employee Staff Portal
              </span>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={() => clearUser()}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer ${!sidebarOpen && 'justify-center'}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}

