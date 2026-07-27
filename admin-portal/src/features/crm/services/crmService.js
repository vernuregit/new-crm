import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Fetch all leads from Firestore
 */
export const getLeads = async (orgId = 'org_real') => {
  try {
    const leadsRef = collection(db, 'leads')
    const q = query(leadsRef, orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((docSnap) => ({ leadId: docSnap.id, ...docSnap.data() }))
  } catch (err) {
    console.error('Error fetching leads from Firestore:', err)
    return []
  }
}

/**
 * Create a new lead document in Firestore
 */
export const createLead = async (orgId = 'org_real', leadData) => {
  try {
    const leadsRef = collection(db, 'leads')
    const docRef = await addDoc(leadsRef, {
      ...leadData,
      orgId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return { leadId: docRef.id, ...leadData }
  } catch (err) {
    console.error('Error creating lead in Firestore:', err)
    return { leadId: `lead_${Date.now()}`, ...leadData }
  }
}

/**
 * Update lead pipeline stage in Firestore
 */
export const updateLeadStageInDb = async (orgId, leadId, stageId, stageName) => {
  try {
    if (!leadId) return
    const leadRef = doc(db, 'leads', leadId)
    await updateDoc(leadRef, {
      pipelineStageId: stageId,
      pipelineStage: stageName,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error updating lead stage in Firestore:', err)
  }
}

/**
 * Delete a lead from Firestore
 */
export const deleteLeadFromDb = async (orgId, leadId) => {
  try {
    if (!leadId) return
    const leadRef = doc(db, 'leads', leadId)
    await deleteDoc(leadRef)
  } catch (err) {
    console.error('Error deleting lead from Firestore:', err)
  }
}
