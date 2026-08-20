import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Subscribe to all tickets relevant to this employee:
 * 1) Tickets created by the employee (internal IT/HR)
 * 2) Client project support tickets assigned to projects this employee works on
 */
export const subscribeEmployeeHelpDesk = (uid, callback) => {
  if (!uid) return () => {}
  try {
    const colRef = collection(db, 'helpDeskTickets')
    return onSnapshot(
      colRef,
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        // Filter tickets that belong to this employee:
        // - created by this employee
        // - or where assignedEmployeeIds contains this employee's uid
        const relevant = all.filter((ticket) => {
          const isCreator = ticket.createdBy === uid
          const isAssigned = Array.isArray(ticket.assignedEmployeeIds) &&
            ticket.assignedEmployeeIds.map(String).includes(String(uid))
          return isCreator || isAssigned
        })

        // Sort by timestamp desc safely
        relevant.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
          return timeB - timeA
        })

        callback(relevant)
      },
      (error) => {
        console.error('Error subscribing to employee help desk:', error)
        callback([])
      }
    )
  } catch (err) {
    console.error('Failed to setup subscribeEmployeeHelpDesk:', err)
    return () => {}
  }
}

export const subscribeMyTickets = subscribeEmployeeHelpDesk

export const createTicket = async (uid, ticketData) => {
  if (!uid) throw new Error('User ID is required')
  const ticketsRef = collection(db, 'helpDeskTickets')
  return await addDoc(ticketsRef, {
    ...ticketData,
    createdBy: uid,
    replies: [],
    status: ticketData.status || 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export const addTicketReply = async (ticketId, reply) => {
  if (!ticketId) throw new Error('Ticket ID is required')
  const ticketRef = doc(db, 'helpDeskTickets', ticketId)
  const replyItem = {
    id: `rep_${Date.now()}`,
    senderId: reply.senderId,
    senderName: reply.senderName,
    senderRole: reply.senderRole || 'employee',
    message: reply.message,
    createdAt: new Date().toISOString(),
  }
  await updateDoc(ticketRef, {
    replies: arrayUnion(replyItem),
    updatedAt: new Date().toISOString(),
  })
  return replyItem
}

export const updateTicketStatus = async (ticketId, status) => {
  if (!ticketId) throw new Error('Ticket ID is required')
  const ticketRef = doc(db, 'helpDeskTickets', ticketId)
  return await updateDoc(ticketRef, {
    status: status.toLowerCase(),
    updatedAt: new Date().toISOString(),
  })
}

export const closeTicket = async (ticketId) => {
  return updateTicketStatus(ticketId, 'resolved')
}
