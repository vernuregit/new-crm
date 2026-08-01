import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { SubtaskStepper } from './components/SubtaskStepper'
import { useProjectStore } from './stores/projectStore'
import { useTeamStore } from '../team/stores/teamStore'
import { getEmployees } from '../team/services/teamService'
import {
  FolderKanban,
  Kanban,
  Clock,
  Plus,
  User,
  X,
  Trash2,
  Search
} from 'lucide-react'

const STATUS_DOT_COLORS = {
  todo: 'bg-sky-500 dark:bg-sky-400',
  blue: 'bg-sky-500 dark:bg-sky-400',
  sky: 'bg-sky-500 dark:bg-sky-400',
  in_progress: 'bg-indigo-500 dark:bg-indigo-400',
  indigo: 'bg-indigo-500 dark:bg-indigo-400',
  in_review: 'bg-amber-500 dark:bg-amber-400',
  amber: 'bg-amber-500 dark:bg-amber-400',
  done: 'bg-emerald-500 dark:bg-emerald-400',
  emerald: 'bg-emerald-500 dark:bg-emerald-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
  rose: 'bg-rose-500 dark:bg-rose-400',
}

const getStatusDotBg = (status) => {
  if (!status) return 'bg-sky-500 dark:bg-sky-400'
  if (typeof status === 'string') return STATUS_DOT_COLORS[status] || 'bg-sky-500 dark:bg-sky-400'
  return (
    STATUS_DOT_COLORS[status.id] ||
    STATUS_DOT_COLORS[status.color] ||
    'bg-sky-500 dark:bg-sky-400'
  )
}

export const TaskBoard = () => {
  const {
    tasks,
    projects,
    statuses,
    addTask,
    updateTaskStatus,
    deleteTask,
    logHoursToTask,
    fetchProjectsAndTasks,
    addCustomStatus,
    selectedProjectId,
    setSelectedProjectId
  } = useProjectStore()
  const { employees, setEmployees } = useTeamStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('all')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddStatusModal, setShowAddStatusModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [deleteConfirmTask, setDeleteConfirmTask] = useState(null)
  const [hoursToLog, setHoursToLog] = useState('')

  // Drag & Drop State
  const [draggedOverCol, setDraggedOverCol] = useState(null)
  const [draggingTaskId, setDraggingTaskId] = useState(null)

  // Drag & Drop Handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingTaskId(taskId)
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    setDraggedOverCol(null)
  }

  const handleDragOver = (e, statusId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedOverCol !== statusId) {
      setDraggedOverCol(statusId)
    }
  }

  const handleDragLeave = (e, statusId) => {
    if (draggedOverCol === statusId) {
      setDraggedOverCol(null)
    }
  }

  const handleDrop = async (e, targetStatusId) => {
    e.preventDefault()
    setDraggedOverCol(null)
    setDraggingTaskId(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = tasks.find((t) => t.taskId === taskId)
    if (task && task.status !== targetStatusId) {
      updateTaskStatus(taskId, targetStatusId)
    }
  }

  // New status form state
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState('purple')

  // New task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.projectId || '')
  const [priority, setPriority] = useState('medium')
  const [assignee, setAssignee] = useState(employees[0]?.displayName || 'Sarah Jenkins')
  const [estimatedHours, setEstimatedHours] = useState('10')

  useEffect(() => {
    fetchProjectsAndTasks()
  }, [fetchProjectsAndTasks])

  useEffect(() => {
    if (employees.length === 0) {
      getEmployees().then((data) => {
        if (data && data.length > 0) setEmployees(data)
      })
    }
  }, [employees.length, setEmployees])

  useEffect(() => {
    if (employees.length > 0 && !assignee) {
      setAssignee(employees[0].displayName)
    }
  }, [employees, assignee])

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesAssignee = filterAssignee === 'all' || t.assigneeName === filterAssignee
    return matchesSearch && matchesAssignee
  })

  const liveSelectedTask = selectedTask ? tasks.find((t) => t.taskId === selectedTask.taskId) || selectedTask : null

  const handleCreateTask = (e) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    const proj = projects.find((p) => p.projectId === projectId)

    addTask({
      title: taskTitle,
      description: taskDesc,
      projectId,
      projectName: proj?.name || 'Project Work',
      priority,
      assigneeName: assignee,
      estimatedHours: Number(estimatedHours) || 0,
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
    })

    setTaskTitle('')
    setTaskDesc('')
    setShowAddModal(false)
  }

  const handleCreateStatus = async (e) => {
    e.preventDefault()
    if (!newStatusName.trim()) return

    await addCustomStatus({
      name: newStatusName.trim(),
      color: newStatusColor,
    })

    setNewStatusName('')
    setShowAddStatusModal(false)
  }

  const handleLogHours = (e) => {
    e.preventDefault()
    if (!selectedTask || !hoursToLog || Number(hoursToLog) <= 0) return

    logHoursToTask(selectedTask.taskId, Number(hoursToLog))
    setHoursToLog('')
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Task Sprint Board"
          description="Track cross-project task assignments, sprint statuses, and subtask execution timelines"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              New Task
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
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="all">All Assignees</option>
              {employees.map((emp) => (
                <option key={emp.uid || emp.displayName} value={emp.displayName}>
                  {emp.displayName}
                </option>
              ))}
            </select>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Task Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px]">
        {statuses.map((status) => {
          const colTasks = filteredTasks.filter((t) => t.status === status.id)

          return (
            <div
              key={status.id}
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDragLeave={(e) => handleDragLeave(e, status.id)}
              onDrop={(e) => handleDrop(e, status.id)}
              className={`w-72 shrink-0 border rounded-2xl p-3 flex flex-col space-y-3 transition-all ${
                draggedOverCol === status.id
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-lg'
                  : 'bg-slate-100/90 dark:bg-[#12151E] border-slate-200 dark:border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${getStatusDotBg(status)}`} />
                  {status.name}
                </span>
                <Badge variant="brand">{colTasks.length}</Badge>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {colTasks.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[11px] text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-transparent">
                    No tasks in {status.name}
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <div
                      key={t.taskId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, t.taskId)}
                      onDragEnd={handleDragEnd}
                      className={`transition-opacity cursor-grab active:cursor-grabbing ${
                        draggingTaskId === t.taskId ? 'opacity-40 scale-95' : 'opacity-100'
                      }`}
                    >
                      <Card
                        hover
                        className="p-3.5 space-y-2.5 bg-white dark:bg-[#181C27] border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 relative group shadow-sm"
                        onClick={() => setSelectedTask(t)}
                      >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {t.title}
                        </span>
                        <Badge
                          variant={
                            t.priority === 'critical' || t.priority === 'high'
                              ? 'danger'
                              : 'info'
                          }
                        >
                          {t.priority}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{t.projectName}</p>

                      {/* Subtask Mini Stepper Bar on Kanban Card */}
                      <SubtaskStepper taskId={t.taskId} subtasks={t.subtasks || []} compact={true} />

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800/60">
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> {t.loggedHours} / {t.estimatedHours}h
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <User className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {t.assigneeName}
                        </span>
                      </div>

                      <div
                        className="pt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Status:</span>
                        <select
                          value={t.status}
                          onChange={(e) => updateTaskStatus(t.taskId, e.target.value)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-[10px] text-slate-800 dark:text-slate-300 rounded px-1.5 py-0.5 focus:outline-none"
                        >
                          {statuses.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Card>
                  </div>
                ))
                )}
              </div>
            </div>
          )
        })}

        {/* Sticky Floating + Add Status Button (Pinned to Right Edge) */}
        <div className="sticky right-0 shrink-0 self-start z-10 pl-3 py-1 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent dark:from-[#0D0F17] dark:via-[#0D0F17]/90">
          <button
            type="button"
            onClick={() => setShowAddStatusModal(true)}
            title="Add Custom Status Column"
            className="w-10 h-10 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 border border-indigo-400/30 group"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
          </button>
        </div>
      </div>

      {/* New Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Create Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <Input
                label="Task Title"
                placeholder="e.g. Implement Security Rules"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Target Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-100/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="low" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Low</option>
                    <option value="medium" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Medium</option>
                    <option value="high" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">High</option>
                    <option value="critical" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Assignee</label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full bg-slate-100/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {employees.map((emp) => (
                      <option key={emp.uid || emp.displayName} value={emp.displayName} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {emp.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Estimated Hours"
                type="number"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Save Task
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Task Log Hours & Subtask Timeline Detail Modal */}
      {liveSelectedTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl p-6 space-y-6 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{liveSelectedTask.title}</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{liveSelectedTask.projectName}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400 block">Assignee</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">{liveSelectedTask.assigneeName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-500 dark:text-slate-400 block">Logged / Target Work</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{liveSelectedTask.loggedHours} / {liveSelectedTask.estimatedHours} hrs</span>
              </div>
            </div>

            {/* Interactive Vertical Subtask Timeline */}
            <SubtaskStepper taskId={liveSelectedTask.taskId} subtasks={liveSelectedTask.subtasks || []} />

            {/* Quick Log Additional Hours */}
            <form onSubmit={handleLogHours} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Input
                label="Log Additional Hours"
                type="number"
                placeholder="e.g. 4"
                value={hoursToLog}
                onChange={(e) => setHoursToLog(e.target.value)}
              />

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => {
                    setDeleteConfirmTask(liveSelectedTask)
                    setSelectedTask(null)
                  }}
                >
                  Delete Task
                </Button>
                <Button type="submit" variant="primary" size="sm" className="flex-1" icon={Clock}>
                  Log Hours
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Confirm Delete Task Modal */}
      {deleteConfirmTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-500" /> Confirm Delete Task
              </h3>
              <button
                onClick={() => setDeleteConfirmTask(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to delete task <strong className="text-slate-900 dark:text-white">{deleteConfirmTask.title}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button variant="secondary" onClick={() => setDeleteConfirmTask(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  const id = deleteConfirmTask.taskId || deleteConfirmTask.id
                  deleteTask(id)
                  await updateTaskStatusInDb('org_real', id, 'deleted')
                  setDeleteConfirmTask(null)
                }}
              >
                Yes, Delete Task
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Create Custom Status Modal */}
      {showAddStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Add Custom Task Status</h3>
              <button
                onClick={() => setShowAddStatusModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStatus} className="space-y-4">
              <Input
                label="Status Name"
                placeholder="e.g. In QA, Blocked, Testing, Backlog"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                required
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Badge Theme Color</label>
                <select
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="purple">Purple Theme</option>
                  <option value="indigo">Indigo Theme</option>
                  <option value="blue">Blue Theme</option>
                  <option value="emerald">Emerald Theme</option>
                  <option value="amber">Amber Theme</option>
                  <option value="rose">Rose / Red Theme</option>
                  <option value="cyan">Cyan Theme</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddStatusModal(false)}
                  className="w-1/3"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Add Status
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
