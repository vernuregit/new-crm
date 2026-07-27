import React, { useState, useEffect } from 'react'
import { useUserStore } from '../../stores/userStore'
import { useProjectStore } from '../projects/stores/projectStore'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  CheckCircle2,
  Clock,
  Calendar,
  BookOpen,
  TrendingUp,
  Briefcase,
  Star,
  ArrowRight,
  Users,
  FolderKanban,
  Plus
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const quickLinks = [
  { name: 'Projects', path: '/projects/list', icon: FolderKanban, color: 'indigo', desc: 'Overview of active projects & completion status' },
  { name: 'Sprint Task Board', path: '/tasks', icon: Briefcase, color: 'indigo', desc: 'View and manage sprint task assignments' },
  { name: 'Time Tracking', path: '/time', icon: Clock, color: 'blue', desc: 'Log billable hours and track task time' },
  { name: 'Team Directory', path: '/directory', icon: Users, color: 'purple', desc: 'Browse team directory and skills' },
  { name: 'Attendance', path: '/attendance', icon: Calendar, color: 'emerald', desc: 'Clock in/out and view presence status' },
  { name: 'Leave & PTO', path: '/team/leave', icon: Calendar, color: 'emerald', desc: 'Request annual/sick leave & check PTO balance' },
  { name: 'Knowledge Base', path: '/knowledge', icon: BookOpen, color: 'amber', desc: 'Access SOPs and internal documentation' },
]

const colorMap = {
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

export const EmployeeDashboard = () => {
  const { user } = useUserStore()
  const { tasks, projects, updateTaskStatus, addTask, fetchProjectsAndTasks } = useProjectStore()

  const displayName = user?.displayName || 'Team Member'
  const firstName = displayName.split(' ')[0]

  const [newFocusTitle, setNewFocusTitle] = useState('')
  const [showAddFocus, setShowAddFocus] = useState(false)

  useEffect(() => {
    fetchProjectsAndTasks()
  }, [fetchProjectsAndTasks])

  // Filter tasks assigned to logged-in user or open team tasks
  const userTasks = tasks.filter((t) => !t.assigneeName || t.assigneeName === displayName)
  const displayTasks = userTasks.length > 0 ? userTasks : tasks

  // Computed Production Metrics
  const assignedTaskCount = displayTasks.length
  const totalHoursLogged = displayTasks.reduce((sum, t) => sum + (Number(t.loggedHours) || 0), 0)
  const activeProjectCount = projects.filter((p) => p.status === 'active').length

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const handleToggleTaskStatus = (t) => {
    const nextStatus = t.status === 'done' ? 'in_progress' : 'done'
    updateTaskStatus(t.taskId, nextStatus)
  }

  const handleAddQuickFocus = (e) => {
    e.preventDefault()
    if (!newFocusTitle.trim()) return

    const defaultProj = projects[0]?.projectId || 'proj_201'
    const defaultProjName = projects[0]?.name || 'SaaS Platform Redesign'

    addTask({
      title: newFocusTitle,
      description: 'Quick task created from today focus list',
      projectId: defaultProj,
      projectName: defaultProjName,
      priority: 'high',
      assigneeName: displayName,
      estimatedHours: 4,
      dueDate: new Date().toISOString().split('T')[0],
    })

    setNewFocusTitle('')
    setShowAddFocus(false)
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-600/20 dark:via-purple-600/10 dark:to-blue-600/20 border border-indigo-200 dark:border-indigo-500/20 p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg shadow-lg">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {firstName}!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{today}</p>
            </div>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm mt-4 max-w-xl">
            Welcome to your staff workspace. Manage your sprint deliverables, log hours, coordinate attendance, and collaborate with your team.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <Badge variant="brand">Staff Portal</Badge>
            <Badge variant="success">Production Ready</Badge>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Tasks Assigned', value: `${assignedTaskCount}`, icon: CheckCircle2, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Hours Logged This Week', value: `${totalHoursLogged}h`, icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Active Projects', value: `${activeProjectCount}`, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          )
        })}
      </div>

      {/* Today's Focus */}
      <Card className="p-6 border-slate-200 dark:border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Today's Priority Focus</h2>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={Plus}
            onClick={() => setShowAddFocus(!showAddFocus)}
          >
            Add Focus Task
          </Button>
        </div>

        {showAddFocus && (
          <form onSubmit={handleAddQuickFocus} className="flex items-center gap-2 pt-2 pb-2">
            <input
              type="text"
              placeholder="Enter new task focus title..."
              value={newFocusTitle}
              onChange={(e) => setNewFocusTitle(e.target.value)}
              className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <Button type="submit" size="sm" variant="primary">
              Save
            </Button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayTasks.slice(0, 6).map((task) => {
            const isDone = task.status === 'done'
            return (
              <div
                key={task.taskId}
                onClick={() => handleToggleTaskStatus(task)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  isDone
                    ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs block truncate ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200 font-medium'}`}>
                    {task.title}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{task.projectName}</span>
                </div>
                <Badge
                  variant={task.priority === 'critical' || task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}
                  className="shrink-0"
                >
                  {task.priority || 'medium'}
                </Badge>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Quick Access Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Quick Workspaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            const colors = colorMap[link.color]
            return (
              <NavLink key={link.path} to={link.path}>
                <Card hover className="p-5 space-y-3 border-slate-200 dark:border-slate-800 group cursor-pointer h-full">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colors}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{link.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{link.desc}</p>
                  </div>
                </Card>
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

