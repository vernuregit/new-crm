import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  Users,
  CheckCircle2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
  Heart,
  Bell,
  Megaphone,
  FileText,
  Receipt,
  IndianRupee,
  Target,
  LifeBuoy,
  Building2,
  Send,
} from 'lucide-react'
import haloLogo from '../../assets/halologo.png'
import { useUIStore } from '../../stores/uiStore'
import { useUserStore } from '../../stores/userStore'

const NAV_GROUPS = [
  {
    key: 'workspace',
    label: 'Workspace',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    key: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    items: [
      { name: 'Projects', path: '/projects/list', icon: FolderKanban },
      { name: 'Sprint Tasks', path: '/tasks', icon: Briefcase },
      { name: 'Work Timeline', path: '/timeline', icon: CalendarDays },
      { name: 'Client Documents', path: '/client-documents', icon: Send },
    ],
  },

  {
    key: 'team',
    label: 'Team',
    icon: Users,
    items: [
      { name: 'Team Directory', path: '/directory', icon: Users },
      { name: 'Attendance', path: '/attendance', icon: CheckCircle2 },
      { name: 'Leave & PTO', path: '/team/leave', icon: Calendar },
    ],
  },
  {
    key: 'hr',
    label: 'Finance',
    icon: IndianRupee,
    items: [
      { name: 'My Payslips', path: '/payslips', icon: IndianRupee },
      { name: 'Documents', path: '/documents', icon: FileText },
    ],
  },
  {
    key: 'personal',
    label: 'Personal',
    icon: Target,
    items: [
      { name: 'My Goals', path: '/goals', icon: Target },
      { name: 'Wellness', path: '/wellness', icon: Heart },
      { name: 'My Profile', path: '/profile', icon: User },
    ],
  },
  {
    key: 'company',
    label: 'Company',
    icon: Building2,
    items: [
      { name: 'Announcements', path: '/announcements', icon: Megaphone },
      { name: 'Company Calendar', path: '/calendar', icon: Calendar },
    ],
  },
  // Hidden for now — can be re-enabled later:
  // {
  //   key: 'support',
  //   label: 'Support',
  //   icon: LifeBuoy,
  //   items: [
  //     { name: 'Notifications', path: '/notifications', icon: Bell },
  //     { name: 'Help Desk', path: '/helpdesk', icon: LifeBuoy },
  //   ],
  // },
]

export const EmployeeSidebar = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { user, userDoc, clearUser } = useUserStore()
  const location = useLocation()

  // Determine which group contains the active route (auto-expand it)
  const getInitialExpanded = () => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.length > 1 && g.items.some((item) => location.pathname.startsWith(item.path))
    )
    return activeGroup ? { [activeGroup.key]: true } : {}
  }

  const [expandedGroups, setExpandedGroups] = useState(getInitialExpanded)

  useEffect(() => {
    const activeGroup = NAV_GROUPS.find((g) =>
      g.items.length > 1 && g.items.some((item) => location.pathname.startsWith(item.path))
    )
    if (activeGroup) {
      setExpandedGroups({ [activeGroup.key]: true })
    }
  }, [location.pathname])

  const toggleGroup = (key) => {
    if (!sidebarOpen) return // In collapsed mode, don't toggle (all hidden)
    setExpandedGroups((prev) => (prev[key] ? {} : { [key]: true }))
  }

  const displayName = userDoc?.displayName || user?.displayName || 'Employee Staff'
  const systemRoles = new Set(['employee', 'admin', 'owner', 'superadmin', 'client'])
  const rawRole = userDoc?.roleName || userDoc?.designation || userDoc?.jobTitle || userDoc?.role || ''
  const jobRole = systemRoles.has(String(rawRole).toLowerCase().trim())
    ? ''
    : String(rawRole).trim()
  const roleLabel = jobRole || 'Employee Portal'

  const isGroupActive = (group) =>
    group.items.some((item) => location.pathname.startsWith(item.path))

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-chrome border-r border-border transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-border">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-11 h-11 bg-surface p-1 rounded-full border border-border shadow-sm flex items-center justify-center shrink-0">
            <img src={haloLogo} alt="The Halo Effect Consulting" className="w-full h-full object-contain rounded-full" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-bold text-fg text-xs tracking-wide whitespace-nowrap">
                EMPLOYEE PORTAL
              </span>
              <span className="text-[10px] text-accent font-semibold tracking-wider mt-1 uppercase whitespace-nowrap">
                EMPLOYEE MODE
              </span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg bg-surface hover:bg-border text-muted hover:text-fg flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-border"
        >
          {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Groups */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const GroupIcon = group.icon
          const isExpanded = expandedGroups[group.key]
          const groupActive = isGroupActive(group)
          const isSingleItem = group.items.length === 1

          // Single-item groups (Dashboard): render as direct NavLink
          if (isSingleItem) {
            const item = group.items[0]
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mx-1 ${
                    isActive
                      ? 'bg-accent-soft text-accent'
                      : 'text-muted hover:text-fg hover:bg-surface'
                  }`
                }
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.name}</span>}
              </NavLink>
            )
          }

          return (
            <div key={group.key} className="mx-1">
              {/* Group Header Button */}
              <button
                onClick={() => toggleGroup(group.key)}
                title={!sidebarOpen ? group.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  groupActive && !isExpanded
                    ? 'bg-accent-soft text-accent'
                    : groupActive && isExpanded
                    ? 'text-accent'
                    : 'text-muted hover:text-fg hover:bg-surface'
                }`}
              >
                <GroupIcon className="w-5 h-5 shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 truncate text-left">{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ease-in-out ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </>
                )}
              </button>

              {/* Group Children */}
              {sidebarOpen && (
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="ml-3 mt-0.5 pl-3 border-l border-border space-y-0.5 pb-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            tabIndex={isExpanded ? 0 : -1}
                            className={({ isActive }) =>
                              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                                isActive
                                  ? 'bg-accent-soft text-accent'
                                  : 'text-muted hover:text-fg hover:bg-surface'
                              }`
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="truncate">{item.name}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer — User Info + Logout */}
      <div className="p-3 border-t border-border space-y-2">
        {/* User badge */}
        <div className={`flex items-center gap-3 p-2 rounded-xl bg-surface border border-border ${!sidebarOpen && 'justify-center'}`}>
          <div className="w-8 h-8 rounded-lg bg-accent-soft text-accent flex items-center justify-center font-bold text-xs shrink-0">
            {displayName?.charAt(0)?.toUpperCase() || 'E'}
          </div>
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-fg truncate">
                {displayName}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 text-accent bg-accent-soft truncate">
                {roleLabel}
              </span>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={() => clearUser()}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer ${!sidebarOpen && 'justify-center'}`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {sidebarOpen && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
