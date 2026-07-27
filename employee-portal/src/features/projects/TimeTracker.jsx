import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useProjectStore } from './stores/projectStore'
import {
  FolderKanban,
  Kanban,
  Clock,
  User,
  CheckCircle2,
  Plus,
  Search,
  X,
  TrendingUp,
  Award,
  Calendar
} from 'lucide-react'

export const TimeTracker = () => {
  const { tasks, projects, logHoursToTask, fetchProjectsAndTasks } = useProjectStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProjectFilter, setSelectedProjectFilter] = useState('all')

  const [showLogModal, setShowLogModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.taskId || '')
  const [hoursInput, setHoursInput] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchProjectsAndTasks()
  }, [fetchProjectsAndTasks])

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigneeName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesProj = selectedProjectFilter === 'all' || t.projectId === selectedProjectFilter
    return matchesSearch && matchesProj
  })

  // Production Metrics
  const totalLoggedHours = tasks.reduce((sum, t) => sum + (Number(t.loggedHours) || 0), 0)
  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0)
  const remainingHours = Math.max(0, totalEstimatedHours - totalLoggedHours)
  const targetWeeklyCapacity = 40 * 3
  const utilizationRate = Math.min(100, Math.round((totalLoggedHours / targetWeeklyCapacity) * 100))

  const handleSaveLog = (e) => {
    e.preventDefault()
    if (!selectedTaskId || !hoursInput || Number(hoursInput) <= 0) return

    logHoursToTask(selectedTaskId, Number(hoursInput))
    setHoursInput('')
    setLogNotes('')
    setShowLogModal(false)
  }

  const openLogForTask = (taskId) => {
    setSelectedTaskId(taskId)
    setShowLogModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Time Tracking & Utilization"
          description="Log billable hours, monitor task time estimates, and track team productivity"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowLogModal(true)}>
              Log Hours
            </Button>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <NavLink
              to="/projects/list"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <FolderKanban className="w-3.5 h-3.5" /> All Projects
            </NavLink>
            <NavLink
              to="/projects/tasks"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Kanban className="w-3.5 h-3.5" /> Task Board
            </NavLink>
            <NavLink
              to="/projects/time"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Clock className="w-3.5 h-3.5" /> Time Tracking
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.name}
                </option>
              ))}
            </select>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search log..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Hours Logged
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalLoggedHours} hrs</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Estimated
            </span>
            <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{totalEstimatedHours} hrs</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Remaining Work
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{remainingHours} hrs</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Team Utilization
            </span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{utilizationRate}%</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Time Tracking Log Table */}
      <Card className="overflow-x-auto p-0 border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
              <th className="p-4 font-semibold">Task Name</th>
              <th className="p-4 font-semibold">Project</th>
              <th className="p-4 font-semibold">Assignee</th>
              <th className="p-4 font-semibold">Estimated</th>
              <th className="p-4 font-semibold">Logged Hours</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {filteredTasks.map((t) => (
              <tr key={t.taskId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300">
                <td className="p-4 font-bold text-slate-900 dark:text-slate-200">{t.title}</td>
                <td className="p-4 text-slate-800 dark:text-slate-300">{t.projectName}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">{t.assigneeName}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">{t.estimatedHours} hrs</td>
                <td className="p-4 font-bold text-emerald-600 dark:text-emerald-400">{t.loggedHours} hrs</td>
                <td className="p-4">
                  <Badge variant={t.status === 'done' ? 'success' : 'info'}>{t.status}</Badge>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => openLogForTask(t.taskId)}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 rounded-lg font-semibold transition-colors"
                  >
                    + Log Time
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Log Hours Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Log Work Hours</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-300">Select Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none"
                >
                  {tasks.map((t) => (
                    <option key={t.taskId} value={t.taskId}>
                      {t.title} ({t.projectName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Hours Spent"
                  type="number"
                  placeholder="e.g. 4"
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  required
                />
                <Input
                  label="Date Logged"
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                />
              </div>

              <Input
                label="Work Log Notes"
                placeholder="Brief details of work completed..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowLogModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Clock}>
                  Save Log
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

