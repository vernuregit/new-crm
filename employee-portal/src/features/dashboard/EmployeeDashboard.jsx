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
  CalendarDays,
  Megaphone,
  Target,
  Receipt,
  FileText,
  LifeBuoy,
  Bell,
  Umbrella,
  ChevronRight,
  MapPin,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { isTaskVisibleToUser, isUserOnProject } from '../projects/services/projectService'
import { db } from '../../shared/services/firebaseService'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

const quickLinks = [
  { name: 'Projects', path: '/projects/list', icon: FolderKanban, color: 'indigo', desc: 'Overview of active projects & completion status' },
  { name: 'Sprint Tasks', path: '/tasks', icon: Briefcase, color: 'indigo', desc: 'View and manage sprint task assignments' },
  { name: 'Work Timeline', path: '/timeline', icon: CalendarDays, color: 'blue', desc: 'Daily Mon–Sat log of what you worked on' },
  { name: 'Team Directory', path: '/directory', icon: Users, color: 'purple', desc: 'Browse team directory and skills' },
  { name: 'Attendance', path: '/attendance', icon: Calendar, color: 'emerald', desc: 'Clock in/out and view presence status' },
  { name: 'Leave & PTO', path: '/team/leave', icon: Calendar, color: 'emerald', desc: 'Request annual/sick leave & check PTO balance' },
  { name: 'My Goals', path: '/goals', icon: Target, color: 'purple', desc: 'Track your personal and professional goals' },
]

const colorMap = {
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const QUICK_ACTIONS = [
  { label: 'Submit Leave', path: '/team/leave', icon: Umbrella, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { label: 'View Payslip', path: '/payslips', icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'My Documents', path: '/documents', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
  { label: 'New Ticket', path: '/helpdesk', icon: LifeBuoy, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  { label: 'Notifications', path: '/notifications', icon: Bell, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { label: 'Announcements', path: '/announcements', icon: Megaphone, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
]

export const EmployeeDashboard = () => {
  const { user, userDoc, claims } = useUserStore()
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

  // Dashboard data state
  const [announcements, setAnnouncements] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const [leaveBalance, setLeaveBalance] = useState({ annual: 12, used: 0 })
  const [loadingWidgets, setLoadingWidgets] = useState(true)

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

  // Fetch dashboard widget data
  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false

    const fetchWidgetData = async () => {
      try {
        // Fetch latest 3 announcements
        try {
          const annRef = collection(db, 'announcements')
          const annQ = query(annRef, orderBy('createdAt', 'desc'), limit(3))
          const annSnap = await getDocs(annQ)
          if (!cancelled) {
            setAnnouncements(annSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
          }
        } catch {
          // Collection may not exist yet; silently skip
        }

        // Fetch upcoming calendar events (next 5)
        try {
          const today = new Date().toISOString().split('T')[0]
          const calRef = collection(db, 'companyCalendar')
          const calQ = query(calRef, where('date', '>=', today), orderBy('date', 'asc'), limit(5))
          const calSnap = await getDocs(calQ)
          if (!cancelled) {
            setUpcomingEvents(calSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
          }
        } catch {
          // Collection may not exist yet; silently skip
        }

        // Fetch leave balance (approved leave requests this year)
        try {
          const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
          const leaveRef = collection(db, 'leaveRequests')
          const leaveQ = query(
            leaveRef,
            where('employeeId', '==', currentUserId),
            where('status', '==', 'approved'),
            where('startDate', '>=', yearStart)
          )
          const leaveSnap = await getDocs(leaveQ)
          const usedDays = leaveSnap.docs.reduce((sum, d) => sum + (Number(d.data().daysCount) || 1), 0)
          if (!cancelled) {
            setLeaveBalance({ annual: 24, used: usedDays })
          }
        } catch {
          // Collection may not exist yet; silently skip
        }
      } finally {
        if (!cancelled) setLoadingWidgets(false)
      }
    }

    fetchWidgetData()
    return () => { cancelled = true }
  }, [currentUserId])

  const isBrightSun = currentHour >= 10 && currentHour < 17

  const visibleTasks = tasks.filter((t) => isTaskVisibleToUser(t, user, userDoc, claims, projects, tasks))
  const displayTasks = visibleTasks

  const assignedTaskCount = displayTasks.length
  const totalHoursLogged = displayTasks.reduce((sum, t) => sum + (Number(t.loggedHours) || 0), 0)
  const activeProjectCount = projects.filter((p) => {
    if (p.status !== 'active') return false
    if (isAdmin) return true
    return isUserOnProject(p, user, userDoc, tasks)
  }).length

  const leaveRemaining = Math.max(0, leaveBalance.annual - leaveBalance.used)

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
      assigneeId: currentUserId || null,
      assigneeEmail: currentUserEmail || null,
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

  const eventTypeColors = {
    holiday: 'text-red-500 bg-red-50 dark:bg-red-500/10',
    meeting: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10',
    sprint: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10',
    anniversary: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
    leave: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
  }

  const priorityColors = {
    urgent: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    info: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    event: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
  }

  return (
    <div className="space-y-6">
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

          {userQuote ? (
            <div className="flex-1 max-w-xl mx-0 sm:mx-4 my-2 lg:my-0">
              <p className="text-xs sm:text-sm italic font-medium text-slate-700 dark:text-slate-300 truncate">
                "{userQuote}"
              </p>
            </div>
          ) : null}

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

      {/* Middle Row: Announcements + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Announcements Widget */}
        <Card className="p-5 border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Latest Announcements</h2>
            </div>
            <NavLink
              to="/announcements"
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>
          {loadingWidgets ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              <Megaphone className="w-6 h-6 mx-auto mb-2 opacity-30" />
              No announcements yet.
            </div>
          ) : (
            <div className="space-y-2">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-3 rounded-xl border ${priorityColors[ann.priority] || priorityColors['info']}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1">{ann.title}</span>
                    <Badge variant={ann.priority === 'urgent' ? 'danger' : ann.priority === 'event' ? 'success' : 'neutral'}>
                      {ann.priority || 'info'}
                    </Badge>
                  </div>
                  {ann.body && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{ann.body}</p>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">{ann.author}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Events Widget */}
        <Card className="p-5 border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">Upcoming Events & Holidays</h2>
            </div>
            <NavLink
              to="/calendar"
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-1"
            >
              Calendar <ChevronRight className="w-3 h-3" />
            </NavLink>
          </div>
          {loadingWidgets ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
              <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
              No upcoming events.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((evt) => {
                const colorClass = eventTypeColors[evt.type] || eventTypeColors['meeting']
                return (
                  <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block truncate">{evt.title}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {new Date(evt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <Badge variant="neutral" className="shrink-0 capitalize">{evt.type}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
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
          {displayTasks.length === 0 && (
            <div className="col-span-2 py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No tasks assigned yet.
            </div>
          )}
        </div>
      </Card>

      {/* Quick Workspaces Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Star className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Quick Workspaces
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Wellness Hub Widget */}
      <WellnessWidget />
    </div>
  )
}
