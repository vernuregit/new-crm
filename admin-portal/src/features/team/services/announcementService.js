import {
  collection,
  doc,
  addDoc,
  getDocs,
  writeBatch,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

const COLLECTION_NAME = 'announcements'

/**
 * Dispatches notifications to all employees for a new announcement.
 */
const notifyEmployeesOnAnnouncement = async ({ announcementId, title, body, priority, author }) => {
  try {
    // 1. Fetch all employees from 'employees' collection
    const empSnap = await getDocs(collection(db, 'employees')).catch(() => ({ docs: [] }))
    const employeeIds = new Set()

    empSnap.docs?.forEach((d) => {
      const data = d.data()
      if (data.status !== 'inactive' && data.status !== 'terminated') {
        employeeIds.add(d.id)
        if (data.uid) employeeIds.add(data.uid)
      }
    })

    // 2. Also check 'users' collection for employees/active users
    try {
      const userSnap = await getDocs(collection(db, 'users'))
      userSnap.docs?.forEach((d) => {
        const data = d.data()
        if (data.role !== 'admin' && data.status !== 'inactive') {
          employeeIds.add(d.id)
          if (data.uid) employeeIds.add(data.uid)
        }
      })
    } catch {
      // Ignore if users collection is restricted or not present
    }

    if (employeeIds.size === 0) return

    const previewMessage = body.length > 120 ? `${body.slice(0, 120)}...` : body
    const nowIso = new Date().toISOString()
    const idList = Array.from(employeeIds)

    // 3. Batch insert notifications in chunks of 400 (Firestore max batch is 500)
    const CHUNK_SIZE = 400
    for (let i = 0; i < idList.length; i += CHUNK_SIZE) {
      const chunk = idList.slice(i, i + CHUNK_SIZE)
      const batch = writeBatch(db)

      chunk.forEach((empId) => {
        // Subcollection per-employee: /notifications/{empId}/items/{notifId}
        const notifDocRef = doc(collection(db, 'notifications', empId, 'items'))
        batch.set(notifDocRef, {
          notificationId: notifDocRef.id,
          title: `📢 ${title}`,
          message: previewMessage,
          type: 'announcement',
          priority: (priority || 'info').toLowerCase(),
          isRead: false,
          announcementId: announcementId,
          link: '/announcements',
          author: author || 'Admin',
          createdAt: nowIso,
          serverCreatedAt: serverTimestamp(),
        })
      })

      await batch.commit()
    }
  } catch (notifErr) {
    console.error('Failed to dispatch notifications to employees:', notifErr)
  }
}

/**
 * Subscribe to real-time announcements ordered by creation time descending.
 * @param {Function} callback
 * @returns {Function} unsubscribe function
 */
export const subscribeToAnnouncements = (callback) => {
  try {
    const colRef = collection(db, COLLECTION_NAME)
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        // Sort client-side by createdAt descending safely
        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
          return timeB - timeA
        })
        callback(list)
      },
      (error) => {
        console.error('Error in subscribeToAnnouncements:', error)
        callback([])
      }
    )
  } catch (err) {
    console.error('Failed to setup subscribeToAnnouncements query:', err)
    return () => {}
  }
}

/**
 * Create a new announcement in Firestore and notify all employees
 * @param {Object} data - { title, body, priority, pinned, author, authorId }
 */
export const createAnnouncement = async ({ title, body, priority = 'info', pinned = false, author = 'Admin', authorId = null }) => {
  const payload = {
    title: title.trim(),
    body: body.trim(),
    priority: (priority || 'info').toLowerCase(),
    pinned: Boolean(pinned),
    author: author || 'Admin',
    authorId: authorId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, COLLECTION_NAME), payload)

  // Dispatch notifications to all employees asynchronously
  notifyEmployeesOnAnnouncement({
    announcementId: docRef.id,
    title: payload.title,
    body: payload.body,
    priority: payload.priority,
    author: payload.author,
  })

  return docRef.id
}

/**
 * Update an existing announcement in Firestore
 * @param {string} id - announcement document ID
 * @param {Object} data - fields to update
 */
export const updateAnnouncement = async (id, { title, body, priority, pinned }) => {
  const docRef = doc(db, COLLECTION_NAME, id)
  const payload = {
    updatedAt: serverTimestamp(),
  }

  if (title !== undefined) payload.title = title.trim()
  if (body !== undefined) payload.body = body.trim()
  if (priority !== undefined) payload.priority = (priority || 'info').toLowerCase()
  if (pinned !== undefined) payload.pinned = Boolean(pinned)

  await updateDoc(docRef, payload)
}

/**
 * Toggle the pinned status of an announcement
 * @param {string} id
 * @param {boolean} currentPinnedStatus
 */
export const togglePinAnnouncement = async (id, currentPinnedStatus) => {
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, {
    pinned: !currentPinnedStatus,
    updatedAt: serverTimestamp(),
  })
}

/**
 * Delete an announcement from Firestore
 * @param {string} id
 */
export const deleteAnnouncement = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}
