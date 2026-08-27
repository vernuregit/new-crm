import React from 'react'
import { NavLink } from 'react-router-dom'
import { Briefcase, CalendarDays, Send, StickyNote } from 'lucide-react'

const TABS = [
  { id: 'tasks', label: 'Sprint Tasks', to: 'tasks', icon: Briefcase },
  { id: 'timeline', label: 'Work Timeline', to: 'timeline', icon: CalendarDays },
  { id: 'documents', label: 'Client Documents', to: 'documents', icon: Send },
  { id: 'notes', label: 'Notes', to: 'notes', icon: StickyNote },
]

export const ProjectSessionTabs = () => {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
      {TABS.map((tab) => {
        const Icon = tab.icon
        return (
          <NavLink
            key={tab.id}
            to={tab.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
              }`
            }
          >
            <Icon className="w-3.5 h-3.5" />
            {tab.label}
          </NavLink>
        )
      })}
    </div>
  )
}
