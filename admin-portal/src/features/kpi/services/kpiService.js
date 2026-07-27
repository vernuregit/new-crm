import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Fetch all KPI definitions from Firestore
 */
export const getKpiDefinitions = async () => {
  try {
    const snap = await getDocs(collection(db, 'kpiDefinitions'))
    return snap.docs.map((d) => ({ kpiId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching KPI definitions from Firestore:', err)
    return []
  }
}

/**
 * Create a new KPI definition in Firestore
 */
export const createKpiDefinition = async (kpiData) => {
  try {
    const docRef = await addDoc(collection(db, 'kpiDefinitions'), {
      ...kpiData,
      currentValue: kpiData.currentValue ?? kpiData.targetValue ?? 0,
      status: kpiData.status ?? 'on_track',
      createdAt: new Date().toISOString(),
    })
    return { kpiId: docRef.id, ...kpiData }
  } catch (err) {
    console.error('Error creating KPI definition in Firestore:', err)
    return { kpiId: `kpi_${Date.now()}`, ...kpiData }
  }
}

/**
 * Delete a KPI definition from Firestore
 */
export const deleteKpiDefinitionFromDb = async (kpiId) => {
  try {
    if (!kpiId) return
    await deleteDoc(doc(db, 'kpiDefinitions', kpiId))
  } catch (err) {
    console.error('Error deleting KPI definition from Firestore:', err)
  }
}

/**
 * Save a computed health score snapshot to Firestore
 */
export const saveHealthScore = async (scoreData) => {
  try {
    const docRef = await addDoc(collection(db, 'healthScores'), {
      ...scoreData,
      calculatedAt: new Date().toISOString(),
    })
    return { scoreId: docRef.id, ...scoreData }
  } catch (err) {
    console.error('Error saving health score to Firestore:', err)
  }
}

/**
 * Fetch the latest health score from Firestore
 */
export const getLatestHealthScore = async () => {
  try {
    const q = query(
      collection(db, 'healthScores'),
      orderBy('calculatedAt', 'desc'),
      limit(1)
    )
    const snap = await getDocs(q)
    if (snap.empty) return null
    const d = snap.docs[0]
    return { scoreId: d.id, ...d.data() }
  } catch (err) {
    console.error('Error fetching latest health score from Firestore:', err)
    return null
  }
}
