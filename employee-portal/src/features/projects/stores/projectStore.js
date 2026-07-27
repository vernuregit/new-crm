import { create } from 'zustand'
import {
  getProjectsFromDb,
  getTasksFromDb,
  getTaskStatusesFromDb,
  createTaskStatusInDb,
  createProjectInDb,
  createTaskInDb,
  updateTaskStatusInDb,
  logHoursToTaskInDb,
  deleteTaskFromDb,
  DEFAULT_TASK_STATUSES,
} from '../services/projectService'

const DEMO_PROJECTS = [
  {
    projectId: 'proj_201',
    name: 'SaaS Platform Redesign',
    description: 'Complete UI/UX refactor with Tailwind CSS & React 19',
    status: 'active',
    completionPercent: 75,
    totalTaskCount: 8,
    completedTaskCount: 6,
    totalHoursLogged: 142,
    createdAt: '2024-07-01T10:00:00.000Z',
  },
  {
    projectId: 'proj_202',
    name: 'Mobile App API Integration',
    description: 'REST API endpoint setup and authentication middleware',
    status: 'active',
    completionPercent: 40,
    totalTaskCount: 5,
    completedTaskCount: 2,
    totalHoursLogged: 68,
    createdAt: '2024-07-10T10:00:00.000Z',
  },
]

const DEMO_TASKS = [
  {
    taskId: 'task_101',
    title: 'Implement Dark Mode Theme Toggle',
    description: 'Ensure dark class applies to html root and persists to localStorage',
    projectId: 'proj_201',
    projectName: 'SaaS Platform Redesign',
    priority: 'high',
    status: 'done',
    loggedHours: 12,
    estimatedHours: 14,
    dueDate: '2024-07-28',
  },
  {
    taskId: 'task_102',
    title: 'Design Component Design System',
    description: 'Create reusable Card, Badge, Button, and Modal components',
    projectId: 'proj_201',
    projectName: 'SaaS Platform Redesign',
    priority: 'critical',
    status: 'in_progress',
    loggedHours: 24,
    estimatedHours: 30,
    dueDate: '2024-08-05',
  },
  {
    taskId: 'task_103',
    title: 'Audit API Rate Limits & Auth Tokens',
    description: 'Check Bearer token expiration and token refresh flow',
    projectId: 'proj_202',
    projectName: 'Mobile App API Integration',
    priority: 'medium',
    status: 'todo',
    loggedHours: 4,
    estimatedHours: 10,
    dueDate: '2024-08-10',
  },
]

export const useProjectStore = create((set, get) => ({
  projects: DEMO_PROJECTS,
  tasks: DEMO_TASKS,
  statuses: DEFAULT_TASK_STATUSES,
  loading: false,
  selectedProjectId: null,
  taskFilterStatus: 'all',

  setProjects: (projects) => set({ projects }),
  setTasks: (tasks) => set({ tasks }),
  setStatuses: (statuses) => set({ statuses }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setTaskFilterStatus: (taskFilterStatus) => set({ taskFilterStatus }),

  fetchProjectsAndTasks: async () => {
    set({ loading: true })
    try {
      const [projectsData, tasksData, statusesData] = await Promise.all([
        getProjectsFromDb(),
        getTasksFromDb(),
        getTaskStatusesFromDb(),
      ])
      set({
        projects: projectsData && projectsData.length > 0 ? projectsData : DEMO_PROJECTS,
        tasks: tasksData && tasksData.length > 0 ? tasksData : DEMO_TASKS,
        statuses: statusesData && statusesData.length > 0 ? statusesData : DEFAULT_TASK_STATUSES,
        loading: false,
      })
    } catch (err) {
      console.error('Error fetching project store data from Firestore:', err)
      set({ loading: false })
    }
  },

  addCustomStatus: async (statusObj) => {
    const id = statusObj.id || statusObj.name.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const payload = {
      id,
      name: statusObj.name,
      color: statusObj.color || 'purple',
    }

    set((state) => {
      if (state.statuses.some((s) => s.id === id)) return state
      return { statuses: [...state.statuses, payload] }
    })

    await createTaskStatusInDb(payload)
  },

  addProject: async (newProj) => {
    const payload = {
      projectId: `proj_${Date.now()}`,
      status: 'active',
      type: 'client',
      completionPercent: 0,
      totalTaskCount: 0,
      completedTaskCount: 0,
      totalHoursLogged: 0,
      createdAt: new Date().toISOString(),
      ...newProj,
    }

    set((state) => ({
      projects: [payload, ...state.projects],
    }))

    await createProjectInDb(payload)
  },

  addTask: async (newTask) => {
    const taskId = `task_${Date.now()}`
    const payload = {
      taskId,
      status: 'todo',
      priority: 'medium',
      loggedHours: 0,
      ...newTask,
    }

    set((state) => {
      const updatedTasks = [payload, ...state.tasks]

      // Recalculate parent project task counts
      const projTasks = updatedTasks.filter((t) => t.projectId === newTask.projectId)
      const completedCount = projTasks.filter((t) => t.status === 'done').length
      const totalCount = projTasks.length
      const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      const updatedProjects = state.projects.map((p) =>
        p.projectId === newTask.projectId
          ? {
              ...p,
              totalTaskCount: totalCount,
              completedTaskCount: completedCount,
              completionPercent,
            }
          : p
      )

      return { tasks: updatedTasks, projects: updatedProjects }
    })

    await createTaskInDb(payload)
  },

  updateTaskStatus: async (taskId, newStatus) => {
    set((state) => {
      const updatedTasks = state.tasks.map((t) =>
        t.taskId === taskId ? { ...t, status: newStatus } : t
      )

      const targetTask = state.tasks.find((t) => t.taskId === taskId)
      if (!targetTask) return { tasks: updatedTasks }

      // Recalculate parent project
      const projTasks = updatedTasks.filter((t) => t.projectId === targetTask.projectId)
      const completedCount = projTasks.filter((t) => t.status === 'done').length
      const totalCount = projTasks.length
      const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      const updatedProjects = state.projects.map((p) =>
        p.projectId === targetTask.projectId
          ? {
              ...p,
              completedTaskCount: completedCount,
              completionPercent,
            }
          : p
      )

      return { tasks: updatedTasks, projects: updatedProjects }
    })

    await updateTaskStatusInDb(taskId, newStatus)
  },

  logHoursToTask: async (taskId, hours) => {
    const state = get()
    const targetTask = state.tasks.find((t) => t.taskId === taskId)
    const currentHours = targetTask ? Number(targetTask.loggedHours) || 0 : 0

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.taskId === taskId
          ? { ...t, loggedHours: (Number(t.loggedHours) || 0) + Number(hours) }
          : t
      ),
    }))

    await logHoursToTaskInDb(taskId, hours, currentHours)
  },

  deleteTask: async (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.taskId !== taskId),
    }))

    await deleteTaskFromDb(taskId)
  },
}))
