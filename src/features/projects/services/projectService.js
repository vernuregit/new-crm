import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

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
