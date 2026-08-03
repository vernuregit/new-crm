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
 * Helper to check if a task should be visible to the current user
 */
export const isTaskVisibleToUser = (t, user, userDoc, claims) => {
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

  return Boolean(isCreatorByUid || isCreatorByEmail || isCreatorByName || isAssigneeByName)
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

// ─── Create Task ───────────────────────────────────────────────────────────────
export const createTaskInDb = async (taskData) => {
  try {
    const taskId = taskData.taskId || `task_${Date.now()}`
    const payload = {
      ...taskData,
      taskId,
      id: taskId,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      loggedHours: Number(taskData.loggedHours) || 0,
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
export const updateTaskStatusInDb = async (taskId, newStatus) => {
  try {
    if (!taskId) return
    await updateDoc(doc(db, 'tasks', taskId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    })
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

