import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  DollarSign,
  UserCheck,
  Megaphone,
  BookOpen,
  Activity,
  GitBranch,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Clock,
  FileText,
  Download,
  FolderKanban,
  CheckCircle2,
  Crown,
  User
} from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'

export const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { claims, user, userDoc } = useUserStore()

  const userRole = claims?.role || 'owner'
  const userTier = claims?.tier || 'company'

  // Dynamic Navigation Items Filtered by Role
  const getNavItemsForRole = () => {
    // 1. Client Role Menu
    if (userTier === 'client' || userRole === 'client') {
      return [
        { name: 'Portal Overview', path: '/portal', icon: Layers },
        { name: 'My Projects', path: '/portal/projects', icon: Briefcase },
        { name: 'Invoices & Receipts', path: '/portal/invoices', icon: FileText },
        { name: 'Deliverables & Files', path: '/portal/files', icon: Download },
      ]
    }

    // 2. Employee /  EMPLOYEERole Menu
    if (userRole === 'employee') {
      return [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { name: 'Sprint Task Board', path: '/projects/tasks', icon: Briefcase },
        { name: 'Time Tracking', path: '/projects/time', icon: Clock },
        { name: 'Team Directory', path: '/team/employees', icon: Users },
        { name: 'Attendance', path: '/team/attendance', icon: CheckCircle2 },
        { name: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
      ]
    }

    // 3. Admin / Founder Role Menu (Full Executive Suite)
    return [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { name: 'CRM & Pipeline', path: '/crm', icon: Users },
      { name: 'Projects Management', path: '/projects', icon: Briefcase },
      { name: 'Finance & Invoicing', path: '/finance', icon: DollarSign },
      { name: 'Team Management', path: '/team', icon: UserCheck },
      { name: 'Marketing Hub', path: '/marketing', icon: Megaphone },
      { name: 'KPIs & Health', path: '/kpi', icon: Activity },
      { name: 'Workflows', path: '/workflows', icon: GitBranch },
      { name: 'Knowledge Base', path: '/knowledge', icon: BookOpen },
      { name: 'My Profile', path: '/settings/profile', icon: User },
    ]
  }

  const navItems = getNavItemsForRole()

  const getRoleLabel = () => {
    if (userTier === 'client' || userRole === 'client') return { label: 'Client Workspace', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    if (userRole === 'employee') return { label: 'Employee   EMPLOYEE PORTAL', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' }
    return { label: 'Founder & Admin Suite', color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' }
  }

  const roleMeta = getRoleLabel()

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-white dark:bg-[#12151E] border-r border-slate-200 dark:border-slate-800/80 transition-all duration-300 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'
        }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-wide leading-none">
                BUSINESS OS
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium tracking-wider mt-1 uppercase">
                {userRole.toUpperCase()} MODE
              </span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Links Filtered by Role */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 shadow-sm'
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

      {/* Footer / Active Role Indicator Badge */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80">
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
            {(userDoc?.displayName || user?.displayName || userRole).charAt(0).toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{userDoc?.displayName || user?.displayName || 'Acme Executive'}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border mt-0.5 ${roleMeta.color} truncate`}>
                {roleMeta.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

