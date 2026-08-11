import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

export const DEFAULT_TASK_STATUSES = [
  { id: 'todo', name: 'To Do', color: 'blue' },
  { id: 'in_progress', name: 'In Progress', color: 'indigo' },
  { id: 'in_review', name: 'In Review', color: 'amber' },
  { id: 'done', name: 'Done', color: 'emerald' },
]

/**
 * Check whether the current user is creator/owner/member of a project
 */
export const isUserOnProject = (project, user, userDoc) => {
  if (!project) return false
  const currentUserId = userDoc?.uid || user?.uid || userDoc?.id
  const currentUserEmail = userDoc?.email || user?.email
  const currentDisplayName = userDoc?.displayName || user?.displayName || userDoc?.name

  const matchesIdentity = (id, email, name) =>
    Boolean(
      (currentUserId && id && String(id) === String(currentUserId)) ||
        (currentUserEmail &&
          email &&
          String(email).toLowerCase() === String(currentUserEmail).toLowerCase()) ||
        (currentDisplayName &&
          name &&
          String(name).toLowerCase() === String(currentDisplayName).toLowerCase())
    )

  if (
    matchesIdentity(project.createdBy, project.createdByEmail, project.createdByName) ||
    matchesIdentity(null, null, project.ownerName)
  ) {
    return true
  }

  const members = Array.isArray(project.members) ? project.members : []
  return members.some((m) => {
    if (m == null) return false
    if (typeof m !== 'object') {
      return matchesIdentity(m, m, m)
    }
    return matchesIdentity(m.uid || m.id, m.email, m.name || m.displayName)
  })
}

/**
 * Helper to check if a task should be visible to the current user.
 * Includes tasks on projects where the user was added as a member.
 */
export const isTaskVisibleToUser = (t, user, userDoc, claims, projects = []) => {
  if (!t) return false
  const currentUserId = userDoc?.uid || user?.uid || userDoc?.id
  const currentUserEmail = userDoc?.email || user?.email
  const currentDisplayName = userDoc?.displayName || user?.displayName

  const rawRole = claims?.role || userDoc?.role || 'employee'
  const isAdmin =
    rawRole === 'admin' ||
    rawRole === 'owner' ||
    rawRole === 'superadmin'

  if (isAdmin) return true

  const isCreatorByUid =
    t.createdBy && currentUserId && String(t.createdBy) === String(currentUserId)
  const isCreatorByEmail =
    t.createdByEmail && currentUserEmail && String(t.createdByEmail).toLowerCase() === String(currentUserEmail).toLowerCase()
  const isCreatorByName =
    t.createdByName && currentDisplayName && String(t.createdByName).toLowerCase() === String(currentDisplayName).toLowerCase()
  const isAssigneeByName =
    t.assigneeName && currentDisplayName && String(t.assigneeName).toLowerCase() === String(currentDisplayName).toLowerCase()
  const isAssigneeById =
    t.assigneeId && currentUserId && String(t.assigneeId) === String(currentUserId)
  const isAssigneeByEmail =
    t.assigneeEmail &&
    currentUserEmail &&
    String(t.assigneeEmail).toLowerCase() === String(currentUserEmail).toLowerCase()

  if (
    isCreatorByUid ||
    isCreatorByEmail ||
    isCreatorByName ||
    isAssigneeByName ||
    isAssigneeById ||
    isAssigneeByEmail
  ) {
    return true
  }

  // Show project tasks to employees who were added as project members
  if (Array.isArray(projects) && projects.length > 0) {
    const project = projects.find(
      (p) =>
        (t.projectId && (p.projectId === t.projectId || p.id === t.projectId)) ||
        (t.projectName && p.name && String(p.name).toLowerCase() === String(t.projectName).toLowerCase())
    )
    if (project && isUserOnProject(project, user, userDoc)) {
      return true
    }
  }

  return false
}

/**
 * Derive project card metrics from the live task list
 */
export const computeProjectMetrics = (projectId, tasks = []) => {
  const projTasks = (tasks || []).filter(
    (t) => t.projectId === projectId || t.projectId === String(projectId)
  )
  const totalTaskCount = projTasks.length
  const completedTaskCount = projTasks.filter((t) => t.status === 'done').length
  const totalHoursLogged = projTasks.reduce((sum, t) => sum + (Number(t.loggedHours) || 0), 0)
  const completionPercent =
    totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0

  return {
    totalTaskCount,
    completedTaskCount,
    totalHoursLogged,
    completionPercent,
  }
}

// ─── Fetch Task Statuses ───────────────────────────────────────────────────────
export const getTaskStatusesFromDb = async () => {
  try {
    const snap = await getDocs(collection(db, 'taskStatuses'))
    const customStatuses = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

    // Merge default statuses with custom statuses from Firestore
    const merged = [...DEFAULT_TASK_STATUSES]
    customStatuses.forEach((cs) => {
      if (!merged.some((m) => m.id === cs.id)) {
        merged.push(cs)
      }
    })
    return merged
  } catch (err) {
    console.error('Error fetching task statuses from Firestore:', err)
    return DEFAULT_TASK_STATUSES
  }
}

// ─── Create Custom Task Status ─────────────────────────────────────────────────
export const createTaskStatusInDb = async (statusData) => {
  try {
    const id = statusData.id || `status_${Date.now()}`
    const payload = {
      id,
      name: statusData.name,
      color: statusData.color || 'purple',
      createdBy: statusData.createdBy || null,
      createdByEmail: statusData.createdByEmail || null,
      createdByName: statusData.createdByName || null,
      createdByRole: statusData.createdByRole || null,
      isAdminCreated: Boolean(statusData.isAdminCreated),
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'taskStatuses', id), payload)
    return { ...payload, createdAt: new Date().toISOString() }
  } catch (err) {
    console.error('Error saving custom status to Firestore:', err)
    return statusData
  }
}


// ─── Delete Custom Task Status ─────────────────────────────────────────────────
export const deleteTaskStatusFromDb = async (statusId) => {
  try {
    if (!statusId) return
    await deleteDoc(doc(db, 'taskStatuses', statusId))
  } catch (err) {
    console.error('Error deleting task status from Firestore:', err)
  }
}

// ─── Fetch All Projects ────────────────────────────────────────────────────────
export const getProjectsFromDb = async () => {
  try {
    const snap = await getDocs(collection(db, 'projects'))
    return snap.docs.map((d) => ({ projectId: d.id, id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching projects from Firestore:', err)
    return []
  }
}

// ─── Fetch All Tasks ───────────────────────────────────────────────────────────
export const getTasksFromDb = async () => {
  try {
    const snap = await getDocs(collection(db, 'tasks'))
    return snap.docs.map((d) => ({ taskId: d.id, id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching tasks from Firestore:', err)
    return []
  }
}

// ─── Create Project ────────────────────────────────────────────────────────────
export const createProjectInDb = async (projData) => {
  try {
    const projectId = projData.projectId || `proj_${Date.now()}`
    const payload = {
      ...projData,
      projectId,
      id: projectId,
      status: projData.status || 'active',
      completionPercent: projData.completionPercent || 0,
      totalTaskCount: projData.totalTaskCount || 0,
      completedTaskCount: projData.completedTaskCount || 0,
      totalHoursLogged: projData.totalHoursLogged || 0,
      estimatedDate: projData.estimatedDate || null,
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'projects', projectId), payload)
    return { ...payload, createdAt: new Date().toISOString() }
  } catch (err) {
    console.error('Error creating project in Firestore:', err)
    const projectId = `proj_${Date.now()}`
    return { projectId, id: projectId, ...projData }
  }
}

// ─── Update Project Members ───────────────────────────────────────────────────
export const updateProjectMembersInDb = async (projectId, members) => {
  try {
    if (!projectId) return
    await updateDoc(doc(db, 'projects', projectId), {
      members,
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Error updating project members in Firestore:', err)
  }
}

// ─── Update Project Stats ─────────────────────────────────────────────────────
export const updateProjectStatsInDb = async (projectId, stats) => {
  try {
    if (!projectId || !stats) return
    await updateDoc(doc(db, 'projects', projectId), {
      totalTaskCount: Number(stats.totalTaskCount) || 0,
      completedTaskCount: Number(stats.completedTaskCount) || 0,
      completionPercent: Number(stats.completionPercent) || 0,
      totalHoursLogged: Number(stats.totalHoursLogged) || 0,
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Error updating project stats in Firestore:', err)
  }
}

// ─── Delete Project ───────────────────────────────────────────────────────────
export const deleteProjectFromDb = async (projectId) => {
  try {
    if (!projectId) return
    await deleteDoc(doc(db, 'projects', projectId))
  } catch (err) {
    console.error('Error deleting project from Firestore:', err)
  }
}


// ─── Timer helpers ─────────────────────────────────────────────────────────────
export const startTimerFields = (now = new Date().toISOString()) => ({
  timerStatus: 'running',
  timerAccumulatedMs: 0,
  timerStartedAt: now,
  timerStoppedAt: null,
})

export const getTimerElapsedMs = (entity, nowMs = Date.now()) => {
  if (!entity) return 0
  const accumulated = Number(entity.timerAccumulatedMs) || 0
  if (entity.timerStatus === 'running' && entity.timerStartedAt) {
    const started = new Date(entity.timerStartedAt).getTime()
    if (!Number.isNaN(started)) {
      return Math.max(0, accumulated + (nowMs - started))
    }
  }
  return Math.max(0, accumulated)
}

export const formatElapsed = (ms) => {
  const totalSec = Math.max(0, Math.floor(Number(ms) / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  }
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export const msToLoggedHours = (ms) => Math.round((Math.max(0, Number(ms) || 0) / 3600000) * 100) / 100

export const pauseTimerFields = (entity, now = new Date().toISOString()) => {
  const elapsed = getTimerElapsedMs(entity, new Date(now).getTime())
  return {
    timerStatus: 'paused',
    timerAccumulatedMs: elapsed,
    timerStartedAt: null,
    timerStoppedAt: null,
    loggedHours: msToLoggedHours(elapsed),
  }
}

export const resumeTimerFields = (entity, now = new Date().toISOString()) => {
  if (entity?.timerStatus === 'stopped') return entity
  return {
    timerStatus: 'running',
    timerAccumulatedMs: Number(entity?.timerAccumulatedMs) || 0,
    timerStartedAt: now,
    timerStoppedAt: null,
  }
}

export const stopTimerFields = (entity, now = new Date().toISOString()) => {
  if (entity?.timerStatus === 'stopped') {
    const elapsed = getTimerElapsedMs(entity)
    return {
      timerStatus: 'stopped',
      timerAccumulatedMs: elapsed,
      timerStartedAt: null,
      timerStoppedAt: entity.timerStoppedAt || now,
      loggedHours: msToLoggedHours(elapsed),
    }
  }
  const elapsed = getTimerElapsedMs(entity, new Date(now).getTime())
  return {
    timerStatus: 'stopped',
    timerAccumulatedMs: elapsed,
    timerStartedAt: null,
    timerStoppedAt: now,
    loggedHours: msToLoggedHours(elapsed),
  }
}

// ─── Create Task ───────────────────────────────────────────────────────────────
export const createTaskInDb = async (taskData) => {
  try {
    const taskId = taskData.taskId || `task_${Date.now()}`
    const timerDefaults = startTimerFields()
    const payload = {
      ...timerDefaults,
      ...taskData,
      taskId,
      id: taskId,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      loggedHours: Number(taskData.loggedHours) || 0,
      timerStatus: taskData.timerStatus || timerDefaults.timerStatus,
      timerAccumulatedMs: Number(taskData.timerAccumulatedMs) || 0,
      timerStartedAt: taskData.timerStartedAt || timerDefaults.timerStartedAt,
      timerStoppedAt: taskData.timerStoppedAt || null,
      createdAt: serverTimestamp(),
    }
    await setDoc(doc(db, 'tasks', taskId), payload)
    return { ...payload, createdAt: new Date().toISOString() }
  } catch (err) {
    console.error('Error creating task in Firestore:', err)
    const taskId = `task_${Date.now()}`
    return { taskId, id: taskId, ...taskData }
  }
}

// ─── Update Task Status ────────────────────────────────────────────────────────
export const updateTaskStatusInDb = async (taskId, newStatus, timerPatch = null) => {
  try {
    if (!taskId) return
    const payload = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    }
    if (timerPatch) Object.assign(payload, timerPatch)
    await updateDoc(doc(db, 'tasks', taskId), payload)
  } catch (err) {
    console.error('Error updating task status in Firestore:', err)
  }
}

// ─── Log Hours To Task ─────────────────────────────────────────────────────────
export const logHoursToTaskInDb = async (taskId, additionalHours, currentHours = 0) => {
  try {
    if (!taskId) return
    const newTotal = (Number(currentHours) || 0) + Number(additionalHours)
    await updateDoc(doc(db, 'tasks', taskId), {
      loggedHours: newTotal,
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Error logging hours in Firestore:', err)
  }
}

// ─── Update Task Timer Fields ──────────────────────────────────────────────────
export const updateTaskTimerInDb = async (taskId, timerFields) => {
  try {
    if (!taskId || !timerFields) return
    await updateDoc(doc(db, 'tasks', taskId), {
      ...timerFields,
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Error updating task timer in Firestore:', err)
  }
}

// ─── Update Task Subtasks & Status ─────────────────────────────────────────────
export const updateTaskSubtasksInDb = async (taskId, subtasks, status = null) => {
  try {
    if (!taskId) return
    const payload = { subtasks }
    if (status) payload.status = status
    payload.updatedAt = serverTimestamp()

    await setDoc(doc(db, 'tasks', taskId), payload, { merge: true })
  } catch (err) {
    console.error('Error updating task subtasks in Firestore:', err)
  }
}

// ─── Delete Task ───────────────────────────────────────────────────────────────
export const deleteTaskFromDb = async (taskId) => {
  try {
    if (!taskId) return
    await deleteDoc(doc(db, 'tasks', taskId))
  } catch (err) {
    console.error('Error deleting task from Firestore:', err)
  }
}

