import React, { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { usePortalStore } from './stores/portalStore'
import { useUserStore } from '../../stores/userStore'
import { getClientProjects } from './services/portalService'
import { Folder, Calendar, CheckCircle2, Flag, Loader2 } from 'lucide-react'

export const ClientProjects = () => {
  const { user } = useUserStore()
  const { projects, setProjects } = usePortalStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchProjects = async () => {
      if (user?.uid && projects.length === 0) {
        setIsLoading(true)
        try {
          const projs = await getClientProjects(user.uid)
          setProjects(projs)
        } catch (err) {
          console.warn('Failed to load client projects:', err)
        } finally {
          setIsLoading(false)
        }
      }
    }
    fetchProjects()
  }, [user, projects.length, setProjects])

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          My Projects
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track active milestone deliverables, completion percentages, and timelines.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 dark:text-blue-400 mb-2" />
          <span className="text-xs">Loading projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 border-dashed">
          No active projects assigned to your portal yet.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const completion = Number(p.completionPercent || p.progress || 0)
            const status = p.status || 'Active'
            const isCompleted = completion >= 100 || status.toLowerCase() === 'completed'

            return (
              <Card
                key={p.projectId || p.id || p.name}
                className="p-5 bg-white dark:bg-[#111827] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top: Icon & Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5" />
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {p.name || p.title || 'Untitled Project'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                      {p.description || 'Custom client project deliverables and roadmap.'}
                    </p>
                  </div>
                </div>

                {/* Progress & Milestone Section */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                      <span>Progress</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {completion}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, completion))}%` }}
                      />
                    </div>
                  </div>

                  {/* Milestone & Target Date */}
                  <div className="space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">
                        Milestone: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{p.nextMilestone || p.milestone || 'In Progress'}</strong>
                      </span>
                    </div>
                    {p.dueDate && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>Due: {p.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}


