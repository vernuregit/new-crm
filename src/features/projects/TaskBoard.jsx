import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useProjectStore } from './stores/projectStore'
import {
  FolderKanban,
  Kanban,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  User,
  X,
  Trash2,
  Calendar
} from 'lucide-react'

const TASK_STATUSES = [
  { id: 'todo', name: 'To Do', color: 'blue' },
  { id: 'in_progress', name: 'In Progress', color: 'indigo' },
  { id: 'in_review', name: 'In Review', color: 'amber' },
  { id: 'done', name: 'Done', color: 'emerald' },
]

export const TaskBoard = () => {
  const { tasks, projects, addTask, updateTaskStatus, deleteTask, logHoursToTask } = useProjectStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [hoursToLog, setHoursToLog] = useState('')

  // New task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.projectId || '')
  const [priority, setPriority] = useState('medium')
  const [assignee, setAssignee] = useState('Sarah Jenkins')
  const [estimatedHours, setEstimatedHours] = useState('10')

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

  const handleLogHours = (e) => {
    e.preventDefault()
    if (!selectedTask || !hoursToLog || Number(hoursToLog) <= 0) return

    logHoursToTask(selectedTask.taskId, Number(hoursToLog))
    setHoursToLog('')
    setSelectedTask(null)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Task Sprint Board"
          description="Track cross-project task assignments, sprint statuses, and logged work hours"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              New Task
            </Button>
          }
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
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
      </div>

      {/* Task Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start min-h-[500px]">
        {TASK_STATUSES.map((status) => {
          const colTasks = tasks.filter((t) => t.status === status.id)

          return (
            <div
              key={status.id}
              className="bg-slate-100/90 dark:bg-[#12151E] border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3 flex flex-col space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{status.name}</span>
                <Badge variant="brand">{colTasks.length}</Badge>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {colTasks.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[11px] text-slate-400 dark:text-slate-500 bg-white/50 dark:bg-transparent">
                    No tasks in {status.name}
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <Card
                      key={t.taskId}
                      hover
                      className="p-3.5 space-y-2.5 cursor-pointer bg-white dark:bg-[#181C27] border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 relative group shadow-sm"
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
                          {TASK_STATUSES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* New Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-slate-100 text-sm">Create Task</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
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
                <label className="block text-xs font-medium text-slate-300">Target Project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500"
                >
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-300">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-300">Assignee</label>
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full bg-[#11141E] border border-slate-800 text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Sarah Jenkins">Sarah Jenkins</option>
                    <option value="Alex Rivera">Alex Rivera</option>
                    <option value="David Chen">David Chen</option>
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

      {/* Task Log Hours Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 border-slate-800 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-slate-100 text-sm">{selectedTask.title}</h3>
                <p className="text-xs text-indigo-400">{selectedTask.projectName}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Assignee:</span>
                <span className="text-slate-200 font-medium">{selectedTask.assigneeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span>Logged Work:</span>
                <span className="text-emerald-400 font-bold">{selectedTask.loggedHours} / {selectedTask.estimatedHours} hrs</span>
              </div>
            </div>

            <form onSubmit={handleLogHours} className="space-y-4 pt-2">
              <Input
                label="Log Additional Hours"
                type="number"
                placeholder="e.g. 4"
                value={hoursToLog}
                onChange={(e) => setHoursToLog(e.target.value)}
                required
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  onClick={() => {
                    deleteTask(selectedTask.taskId)
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
    </div>
  )
}
