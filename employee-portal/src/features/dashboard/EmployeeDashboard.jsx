import React, { useState, useEffect } from 'react'
import { useUserStore } from '../../stores/userStore'
import { useProjectStore } from '../projects/stores/projectStore'
import { ClockInOverviewWidget } from './components/ClockInOverviewWidget'
import { WellnessWidget } from '../wellness/WellnessWidget'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  Briefcase,
  Star,
  ArrowRight,
  Users,
  FolderKanban,
  Plus,
  Sun,
  Moon,
  Sparkles,
  CalendarDays,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { isTaskVisibleToUser, isUserOnProject } from '../projects/services/projectService'

const quickLinks = [
  { name: 'Projects', path: '/projects/list', icon: FolderKanban, color: 'indigo', desc: 'Overview of active projects & completion status' },
  { name: 'Sprint Task Board', path: '/tasks', icon: Briefcase, color: 'indigo', desc: 'View and manage sprint task assignments' },
  { name: 'Work Timeline', path: '/timeline', icon: CalendarDays, color: 'blue', desc: 'Daily Mon–Sat log of what you worked on' },
  { name: 'Team Directory', path: '/directory', icon: Users, color: 'purple', desc: 'Browse team directory and skills' },
  { name: 'Attendance', path: '/attendance', icon: Calendar, color: 'emerald', desc: 'Clock in/out and view presence status' },
  { name: 'Leave & PTO', path: '/team/leave', icon: Calendar, color: 'emerald', desc: 'Request annual/sick leave & check PTO balance' },
]

const colorMap = {
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

export const EmployeeDashboard = () => {
  const { user, userDoc, claims, setUser } = useUserStore()
  const { tasks, projects, updateTaskStatus, addTask, fetchProjectsAndTasks } = useProjectStore()

  const currentUserId = userDoc?.uid || user?.uid
  const currentUserEmail = userDoc?.email || user?.email
  const userRole = claims?.role || userDoc?.role || 'employee'
  const isAdmin = userRole === 'admin' || userRole === 'owner' || userRole === 'superadmin' || claims?.role === 'admin' || claims?.role === 'owner' || claims?.role === 'superadmin'

  const displayName = userDoc?.displayName || user?.displayName || 'Team Member'
  const firstName = displayName.split(' ')[0]

  const [newFocusTitle, setNewFocusTitle] = useState('')
  const [showAddFocus, setShowAddFocus] = useState(false)
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours())

  // Custom Proverb / Daily Quote state (read-only on dashboard, editable in Profile)
  const [userQuote, setUserQuote] = useState(() => {
    return userDoc?.quote || userDoc?.proverb || (currentUserId ? localStorage.getItem(`crm_quote_${currentUserId}`) : '') || ''
  })

  useEffect(() => {
    if (userDoc?.quote || userDoc?.proverb) {
      setUserQuote(userDoc.quote || userDoc.proverb)
    } else if (currentUserId) {
      const stored = localStorage.getItem(`crm_quote_${currentUserId}`)
      setUserQuote(stored || '')
    }
  }, [userDoc, currentUserId])

  useEffect(() => {
    fetchProjectsAndTasks()
  }, [fetchProjectsAndTasks])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHour(new Date().getHours())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Time-based condition: 10 AM to 5 PM (10:00 - 16:59) is bright sun; after 5 PM (17:00+) & early morning is moon
  const isBrightSun = currentHour >= 10 && currentHour < 17

  // Filter tasks visible to current user (creator, assignee, or project member)
  const visibleTasks = tasks.filter((t) => isTaskVisibleToUser(t, user, userDoc, claims, projects))

  // Filter tasks assigned to logged-in user or open team tasks
  const userTasks = visibleTasks.filter((t) => !t.assigneeName || t.assigneeName === displayName)
  const displayTasks = userTasks.length > 0 ? userTasks : visibleTasks

  // Computed Production Metrics
  const assignedTaskCount = displayTasks.length
  const totalHoursLogged = displayTasks.reduce((sum, t) => sum + (Number(t.loggedHours) || 0), 0)
  const activeProjectCount = projects.filter((p) => {
    if (p.status !== 'active') return false
    if (isAdmin) return true
    const isLegacy = !p.createdBy && (!p.members || p.members.length === 0)
    return isLegacy || isUserOnProject(p, user, userDoc)
  }).length

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
      createdBy: currentUserId || null,
      createdByEmail: currentUserEmail || null,
      createdByName: displayName,
      createdByRole: userRole || 'employee',
      isEmployeeCreated: true,
    })

    setNewFocusTitle('')
    setShowAddFocus(false)
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-600/20 dark:via-purple-600/10 dark:to-blue-600/20 border border-indigo-200 dark:border-indigo-500/20 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-lg shadow-lg shrink-0">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Good {currentHour < 12 ? 'Morning' : currentHour < 17 ? 'Afternoon' : 'Evening'}, {firstName}!
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{today}</p>
            </div>
          </div>

          {/* Middle: Display Custom Proverb / Daily Quote / Motto if set (Clean text only) */}
          {userQuote ? (
            <div className="flex-1 max-w-xl mx-0 sm:mx-4 my-2 lg:my-0">
              <p className="text-xs sm:text-sm italic font-medium text-slate-700 dark:text-slate-300 truncate">
                "{userQuote}"
              </p>
            </div>
          ) : null}

          {/* Big Sun / Moon Icon on the right side */}
          <div className="flex items-center justify-center shrink-0">
            {isBrightSun ? (
              <div
                title="10:00 AM - 5:00 PM: Bright Sun"
                className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.45)] animate-pulse flex items-center justify-center"
              >
                <Sun className="w-10 h-10 fill-amber-400/40 text-amber-500 dark:text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]" />
              </div>
            ) : (
              <div
                title="After 5:00 PM / Night: Moon"
                className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 dark:text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.35)] flex items-center justify-center"
              >
                <Moon className="w-10 h-10 fill-indigo-400/30 text-indigo-400 dark:text-indigo-300 drop-shadow-[0_0_12px_rgba(129,140,248,0.9)]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clock-In & Attendance Command Widget */}
      <ClockInOverviewWidget />

      {/* Wellness Hub Widget */}
      <WellnessWidget />

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

