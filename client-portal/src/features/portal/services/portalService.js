import {
  collection,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Fetch projects for a specific client from Firestore /projects
 */
export const getClientProjects = async (clientId) => {
  try {
    const projRef = collection(db, 'projects')
    const q = clientId
      ? query(projRef, where('clientId', '==', clientId))
      : projRef
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ projectId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching client projects from Firestore:', err)
    return []
  }
}

/**
 * Fetch invoices for a specific client from Firestore /invoices
 */
export const getClientInvoices = async (clientId) => {
  try {
    const invRef = collection(db, 'invoices')
    const q = clientId
      ? query(invRef, where('clientId', '==', clientId))
      : invRef
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ invoiceId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching client invoices from Firestore:', err)
    return []
  }
}

/**
 * Fetch client deliverables from Firestore /deliverables
 */
export const getClientDeliverables = async (clientId) => {
  try {
    const snap = await getDocs(collection(db, 'deliverables'))
    return snap.docs.map((d) => ({ fileId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching client deliverables from Firestore:', err)
    return []
  }
}
