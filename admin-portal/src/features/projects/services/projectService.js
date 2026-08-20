import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
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
 * Fetch task statuses from Firestore
 */
export const getTaskStatusesFromDb = async () => {
  try {
    const snap = await getDocs(collection(db, 'taskStatuses'))
    const customStatuses = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

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

/**
 * Fetch all projects from Firestore
 */
export const getProjects = async () => {
  try {
    const snap = await getDocs(collection(db, 'projects'))
    return snap.docs.map((d) => ({ projectId: d.id, id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching projects from Firestore:', err)
    return []
  }
}

/**
 * Create a project in Firestore
 */
export const createProject = async (projectData) => {
  try {
    const docRef = await addDoc(collection(db, 'projects'), {
      ...projectData,
      estimatedDate: projectData.estimatedDate || null,
      createdAt: new Date().toISOString(),
    })
    return { projectId: docRef.id, id: docRef.id, ...projectData }
  } catch (err) {
    console.error('Error creating project in Firestore:', err)
    return { projectId: `proj_${Date.now()}`, id: `proj_${Date.now()}`, ...projectData }
  }
}

/**
 * Delete a project from Firestore
 */
export const deleteProjectFromDb = async (projectId) => {
  try {
    if (!projectId) return
    await deleteDoc(doc(db, 'projects', projectId))
  } catch (err) {
    console.error('Error deleting project from Firestore:', err)
  }
}

/**
 * Update project details and sync project name to tasks in Firestore
 */
export const updateProjectInDb = async (projectId, updates) => {
  try {
    if (!projectId || !updates) return
    const payload = {
      ...updates,
      updatedAt: serverTimestamp ? serverTimestamp() : new Date().toISOString(),
    }
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])
    await updateDoc(doc(db, 'projects', projectId), payload)

    // Sync updated project name to associated tasks in Firestore
    if (updates.name && typeof updates.name === 'string' && updates.name.trim()) {
      const q = query(collection(db, 'tasks'), where('projectId', '==', projectId))
      const snap = await getDocs(q)
      const promises = snap.docs.map((d) =>
        updateDoc(doc(db, 'tasks', d.id), {
          projectName: updates.name.trim(),
          updatedAt: serverTimestamp ? serverTimestamp() : new Date().toISOString(),
        })
      )
      await Promise.all(promises)
    }
  } catch (err) {
    console.error('Error updating project in Firestore:', err)
  }
}

/**
 * Update project members in Firestore
 */
export const updateProjectMembersInDb = async (projectId, members) => {
  try {
    if (!projectId) return
    await updateDoc(doc(db, 'projects', projectId), {
      members,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error updating project members in Firestore:', err)
  }
}


/**
 * Fetch all tasks from Firestore
 */
export const getTasks = async () => {
  try {
    const snap = await getDocs(collection(db, 'tasks'))
    return snap.docs.map((d) => ({ taskId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching tasks from Firestore:', err)
    return []
  }
}

/**
 * Create a task in Firestore
 */
export const createTask = async (taskData) => {
  try {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...taskData,
      createdAt: new Date().toISOString(),
    })
    return { taskId: docRef.id, ...taskData }
  } catch (err) {
    console.error('Error creating task in Firestore:', err)
    return { taskId: `task_${Date.now()}`, ...taskData }
  }
}

/**
 * Update task status in Firestore
 */
export const updateTaskStatusInDb = async (taskId, newStatus) => {
  try {
    if (!taskId) return
    await updateDoc(doc(db, 'tasks', taskId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error updating task status in Firestore:', err)
  }
}

/**
 * Delete a task from Firestore
 */
export const deleteTaskFromDb = async (taskId) => {
  try {
    if (!taskId) return
    await deleteDoc(doc(db, 'tasks', taskId))
  } catch (err) {
    console.error('Error deleting task from Firestore:', err)
  }
}
