import { create } from 'zustand'

export const useProjectStore = create((set) => ({
  projects: [],
  tasks: [],
  selectedProjectId: null,
  taskFilterStatus: 'all',

  setProjects: (projects) => set({ projects }),
  setTasks: (tasks) => set({ tasks }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
  setTaskFilterStatus: (taskFilterStatus) => set({ taskFilterStatus }),

  addProject: (newProj) =>
    set((state) => ({
      projects: [
        {
          projectId: newProj.projectId || newProj.id || `proj_${Date.now()}`,
          id: newProj.id || newProj.projectId || `proj_${Date.now()}`,
          status: 'active',
          type: 'client',
          completionPercent: 0,
          totalTaskCount: 0,
          completedTaskCount: 0,
          totalHoursLogged: 0,
          createdAt: new Date().toISOString(),
          ...newProj,
        },
        ...state.projects,
      ],
    })),

  deleteProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter(
        (p) => p.projectId !== projectId && p.id !== projectId
      ),
    })),

  addTask: (newTask) =>
    set((state) => {
      const updatedTasks = [
        {
          taskId: `task_${Date.now()}`,
          status: 'todo',
          priority: 'medium',
          loggedHours: 0,
          ...newTask,
        },
        ...state.tasks,
      ]

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
    }),

  updateTaskStatus: (taskId, newStatus) =>
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
    }),

  logHoursToTask: (taskId, hours) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.taskId === taskId
          ? { ...t, loggedHours: (Number(t.loggedHours) || 0) + Number(hours) }
          : t
      ),
    })),

  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.taskId !== taskId),
    })),
}))
