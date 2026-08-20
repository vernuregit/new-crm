import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
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
 * Fetch client deliverables and shared documents from Firestore /deliverables and /clientDocuments
 */
export const getClientDeliverables = async (clientId, clientEmail) => {
  try {
    const docs = []
    const delivRef = collection(db, 'deliverables')

    // 1. Query by clientId
    if (clientId) {
      try {
        const q1 = query(delivRef, where('clientId', '==', clientId))
        const snap1 = await getDocs(q1)
        snap1.docs.forEach((d) => docs.push({ fileId: d.id, ...d.data() }))
      } catch (e) {
        console.warn('Error querying deliverables by clientId:', e)
      }
    }

    // 2. Query by clientEmail
    if (clientEmail) {
      try {
        const q2 = query(delivRef, where('clientEmail', '==', clientEmail))
        const snap2 = await getDocs(q2)
        snap2.docs.forEach((d) => docs.push({ fileId: d.id, ...d.data() }))
      } catch (e) {
        console.warn('Error querying deliverables by clientEmail:', e)
      }
    }

    // 3. Fallback: if no direct filter passed, query deliverables and filter client-side
    if (!clientId && !clientEmail) {
      try {
        const snap = await getDocs(delivRef)
        snap.docs.forEach((d) => docs.push({ fileId: d.id, ...d.data() }))
      } catch (e) {
        console.warn('Error fetching all deliverables:', e)
      }
    }

    // 4. Also check clientDocuments collection if present
    try {
      const cdocsRef = collection(db, 'clientDocuments')
      if (clientId) {
        const snap3 = await getDocs(query(cdocsRef, where('clientId', '==', clientId)))
        snap3.docs.forEach((d) => docs.push({ fileId: d.id, ...d.data() }))
      }
      if (clientEmail) {
        const snap4 = await getDocs(query(cdocsRef, where('clientEmail', '==', clientEmail)))
        snap4.docs.forEach((d) => docs.push({ fileId: d.id, ...d.data() }))
      }
    } catch (_) {}

    // Deduplicate by fileId
    const unique = Array.from(new Map(docs.map((item) => [item.fileId, item])).values())
    return unique
  } catch (err) {
    console.error('Error fetching client deliverables from Firestore:', err)
    return []
  }
}


/**
 * Real-time subscription to client support tickets from Firestore /helpDeskTickets
 */
export const subscribeClientTickets = (clientId, callback) => {
  if (!clientId) return () => {}
  try {
    const ticketsRef = collection(db, 'helpDeskTickets')
    const q = query(ticketsRef, where('createdBy', '==', clientId))
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        callback(list)
      },
      (err) => {
        console.warn('Error subscribing to client tickets:', err)
      }
    )
  } catch (err) {
    console.error('Failed to setup subscribeClientTickets:', err)
    return () => {}
  }
}

/**
 * Fetch client support tickets from Firestore /helpDeskTickets
 */
export const getClientTickets = async (clientId) => {
  try {
    const ticketsRef = collection(db, 'helpDeskTickets')
    const q = clientId
      ? query(ticketsRef, where('createdBy', '==', clientId))
      : ticketsRef
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching client tickets from Firestore:', err)
    return []
  }
}

/**
 * Create a new support ticket in Firestore /helpDeskTickets
 */
export const createClientTicket = async (ticketData) => {
  try {
    const docRef = await addDoc(collection(db, 'helpDeskTickets'), {
      ...ticketData,
      status: ticketData.status || 'open',
      replies: ticketData.replies || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return docRef.id
  } catch (err) {
    console.error('Error creating client support ticket:', err)
    return null
  }
}

/**
 * Add a reply to a support ticket thread
 */
export const addTicketReply = async (ticketId, reply) => {
  try {
    const ticketRef = doc(db, 'helpDeskTickets', ticketId)
    const replyItem = {
      id: `rep_${Date.now()}`,
      senderId: reply.senderId,
      senderName: reply.senderName,
      senderRole: reply.senderRole || 'client',
      message: reply.message,
      createdAt: new Date().toISOString(),
    }
    await updateDoc(ticketRef, {
      replies: arrayUnion(replyItem),
      updatedAt: new Date().toISOString(),
    })
    return replyItem
  } catch (err) {
    console.error('Error adding reply to ticket:', err)
    throw err
  }
}


