import React from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { useWorkflowStore } from './stores/workflowStore'
import { GitBranch, SlidersHorizontal, History } from 'lucide-react'

export const WorkflowHistory = () => {
  const { runs } = useWorkflowStore()

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Workflow Execution History Logs"
          description="Audit trail of automated execution runs, triggers, and action outputs"
        />

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <NavLink
            to="/workflows"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <GitBranch className="w-3.5 h-3.5" /> Automation Rules
          </NavLink>
          <NavLink
            to="/workflows/builder"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Rule Builder
          </NavLink>
          <NavLink
            to="/workflows/history"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <History className="w-3.5 h-3.5" /> Execution Logs
          </NavLink>
        </div>
      </div>

      <div className="space-y-3">
        {runs.map((r) => (
          <Card key={r.runId} hover className="p-4 border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-100 text-sm">{r.workflowName}</h4>
              <Badge variant="success">{r.status}</Badge>
            </div>
            <p className="text-xs text-indigo-400">Triggered by: {r.triggeredBy}</p>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-slate-400 space-y-1">
              {r.logs?.map((log, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-indigo-400">›</span>
                  <span>{log}</span>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-slate-500 block">Executed at: {r.executedAt}</span>
          </Card>
        ))}
      </div>
    </div>
  )
}
