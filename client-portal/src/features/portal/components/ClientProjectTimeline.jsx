import React, { useState, useEffect } from 'react'
import {
  Filter,
  MessageSquare,
  Check,
  FileText,
  UserCheck,
  LifeBuoy,
  FolderKanban,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  ChevronDown,
  CircleDot,
  CheckCircle,
  PlayCircle,
  Layers,
} from 'lucide-react'
import {
  subscribeProjectProcessSteps,
  getProjectProcessSteps,
  subscribeProjectTimeline,
} from '../services/portalService'

// Helper to format timestamps to 'DD MMM, YYYY • hh:mm A'
export const formatTimelineDate = (ts) => {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return String(ts)
    const day = d.getDate()
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[d.getMonth()]
    const year = d.getFullYear()

    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    const hoursStr = hours.toString().padStart(2, '0')

    return `${day} ${month}, ${year} • ${hoursStr}:${minutes} ${ampm}`
  } catch {
    return String(ts)
  }
}

// Icon and badge color resolver
export const getProcessIconConfig = (type, status) => {
  if (status === 'completed') {
    return {
      bg: 'bg-emerald-600',
      textColor: 'text-emerald-400',
      icon: Check,
    }
  }

  switch (type?.toLowerCase()) {
    case 'message':
      return {
        bg: status === 'in_progress' ? 'bg-blue-600 ring-4 ring-blue-500/30' : 'bg-blue-600/80',
        textColor: 'text-blue-400',
        icon: MessageSquare,
      }
    case 'invoice':
      return {
        bg: 'bg-emerald-600',
        textColor: 'text-emerald-400',
        icon: Check,
      }
    case 'document':
      return {
        bg: 'bg-purple-600',
        textColor: 'text-purple-400',
        icon: FileText,
      }
    case 'approval':
      return {
        bg: 'bg-amber-500',
        textColor: 'text-amber-400',
        icon: UserCheck,
      }
    case 'ticket':
    case 'support':
      return {
        bg: 'bg-blue-500',
        textColor: 'text-blue-400',
        icon: LifeBuoy,
      }
    case 'project_created':
    case 'milestone':
    default:
      return {
        bg: status === 'in_progress' ? 'bg-indigo-600 ring-4 ring-indigo-500/30' : 'bg-emerald-600',
        textColor: 'text-emerald-400',
        icon: FolderKanban,
      }
  }
}

export const ClientProjectTimeline = ({ projectId, project, className = '' }) => {
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'in_progress' | 'completed' | 'pending'
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  useEffect(() => {
    if (!projectId) return

    setLoading(true)
    const unsubProcess = subscribeProjectProcessSteps(projectId, (list) => {
      setSteps(list)
      setLoading(false)
    })

    return () => {
      if (typeof unsubProcess === 'function') unsubProcess()
    }
  }, [projectId])

  const totalSteps = steps.length
  const completedSteps = steps.filter((s) => s.status === 'completed').length
  const activeStep = steps.find((s) => s.status === 'in_progress')

  const filteredSteps = steps.filter((s) => {
    if (statusFilter === 'all') return true
    return s.status === statusFilter
  })

  return (
    <div className={`bg-[#0B111E] dark:bg-[#080D1A] border border-slate-800/90 rounded-2xl p-6 text-slate-100 shadow-xl relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800/80">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            Project Process & Stage Tracker
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeStep ? (
              <span>
                Current Stage: <strong className="text-blue-400 font-semibold">{activeStep.title}</strong>
              </span>
            ) : completedSteps === totalSteps && totalSteps > 0 ? (
              <span className="text-emerald-400 font-semibold">All Project Stages Completed</span>
            ) : (
              <span>Live project delivery status and upcoming stages.</span>
            )}
          </p>
        </div>

        {/* Filter Button & Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm"
          >
            <Filter className="w-3.5 h-3.5 text-slate-300" />
            <span>Filter</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {showFilterMenu && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowFilterMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-[#111827] border border-slate-700 rounded-xl shadow-2xl z-30 py-1.5 overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Filter Stages</span>
                  {statusFilter !== 'all' && (
                    <button
                      onClick={() => {
                        setStatusFilter('all')
                        setShowFilterMenu(false)
                      }}
                      className="text-blue-400 hover:underline text-[10px]"
                    >
                      Reset
                    </button>
                  )}
                </div>
                {[
                  { key: 'all', label: 'All Stages' },
                  { key: 'in_progress', label: 'In Progress (Current)' },
                  { key: 'completed', label: 'Completed' },
                  { key: 'pending', label: 'Pending (Upcoming)' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.key)
                      setShowFilterMenu(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between ${
                      statusFilter === opt.key
                        ? 'bg-blue-600/20 text-blue-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {statusFilter === opt.key && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Process Stepper List */}
      <div className="mt-6">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading project process stages...</span>
          </div>
        ) : filteredSteps.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
            <Clock className="w-6 h-6 mx-auto text-slate-500 mb-2 opacity-60" />
            <span>No process stages match the current filter.</span>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 sm:space-y-7 before:absolute before:left-[17px] before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-700/80">
            {filteredSteps.map((step, idx) => {
              const isCompleted = step.status === 'completed'
              const isInProgress = step.status === 'in_progress'
              const isPending = step.status === 'pending'

              const iconConfig = getProcessIconConfig(step.type, step.status)
              const IconComp = iconConfig.icon
              const formattedDate = formatTimelineDate(step.completedAt || step.updatedAt || step.createdAt)

              const metaParts = []
              if (step.author) metaParts.push(step.author)
              if (step.meta) metaParts.push(step.meta)
              if (formattedDate) metaParts.push(formattedDate)

              const subtitle = metaParts.join(' • ')

              return (
                <div
                  key={step.id || idx}
                  className={`relative flex items-start gap-4 p-3 rounded-xl border transition-all ${
                    isInProgress
                      ? 'bg-blue-950/25 border-blue-800/70 ring-1 ring-blue-500/20'
                      : isCompleted
                      ? 'bg-slate-900/30 border-slate-800/60'
                      : 'bg-slate-900/10 border-slate-800/40 opacity-70'
                  }`}
                >
                  {/* Left Circle Icon Badge */}
                  <div
                    className={`relative -ml-[25px] z-10 w-[34px] h-[34px] rounded-full ${iconConfig.bg} text-white flex items-center justify-center shadow-md shrink-0 ring-4 ring-[#0B111E] dark:ring-[#080D1A] transition-transform duration-200 group-hover:scale-105`}
                  >
                    <IconComp className="w-4 h-4" />
                  </div>

                  {/* Right Content */}
                  <div className="pt-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-100 dark:text-white leading-snug break-words">
                        {step.title}
                      </h4>

                      {/* Status Badges */}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" /> Done
                        </span>
                      )}
                      {isInProgress && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                          <CircleDot className="w-3 h-3" /> Current Stage
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Upcoming
                        </span>
                      )}
                    </div>

                    {subtitle && (
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-normal tracking-wide">
                        {subtitle}
                      </p>
                    )}

                    {step.message && (
                      <div className="mt-2 text-xs text-slate-200 bg-slate-900/80 p-3 rounded-lg border border-slate-800/90 font-medium">
                        💬 {step.message}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
