import React from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { usePortalStore } from './stores/portalStore'
import { Briefcase, FileText, Download, Layers, CheckCircle2 } from 'lucide-react'

export const ClientProjects = () => {
  const { projects } = usePortalStore()

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="My Projects Status"
          description="Read-only view of active project milestones, completion percentages, and timelines"
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3 overflow-x-auto">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
              }`
            }
          >
            <Layers className="w-3.5 h-3.5" /> Portal Overview
          </NavLink>
          <NavLink
            to="/portal/projects"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
              }`
            }
          >
            <Briefcase className="w-3.5 h-3.5" /> Projects Status
          </NavLink>
          <NavLink
            to="/portal/invoices"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
              }`
            }
          >
            <FileText className="w-3.5 h-3.5" /> Invoices & Receipts
          </NavLink>
          <NavLink
            to="/portal/files"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
              }`
            }
          >
            <Download className="w-3.5 h-3.5" /> Deliverables & Files
          </NavLink>
        </div>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border-dashed">
            No projects found in this workspace yet.
          </Card>
        ) : (
          projects.map((p) => (
            <Card key={p.projectId} hover className="space-y-4 border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{p.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{p.description}</p>
                </div>
                <Badge variant="success">{p.status}</Badge>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium">Overall Completion</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{p.completionPercent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.completionPercent}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Next Milestone: {p.nextMilestone}
                </span>
                <span className="font-medium">Project Lead: {p.ownerName}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
