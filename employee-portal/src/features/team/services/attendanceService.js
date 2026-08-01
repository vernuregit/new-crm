import { doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

const IS_MOCK = import.meta.env.VITE_FIREBASE_API_KEY === 'mock_api_key_dev'

/**
 * Upserts today's attendance log for the given employee into Firestore.
 *
 * Uses a FLAT collection (no subcollections) to avoid collectionGroup index issues.
 * Path: attendanceLogs/{YYYY-MM-DD}_{uid}
 *
 * @param {string} uid     - Firebase user uid
 * @param {object} payload - Fields to merge into the document
 */
export const upsertAttendanceLog = async (uid, payload) => {
  if (IS_MOCK || !uid) return

  try {
    const date = new Date().toISOString().split('T')[0]
    // Flat doc ID: "2026-07-29_abc123uid"
    const docId = `${date}_${uid}`
    const ref = doc(db, 'attendanceLogs', docId)

    await setDoc(
      ref,
      {
        uid,
        date,
        docId,
        updatedAt: serverTimestamp(),
        ...payload,
      },
      { merge: true }
    )
  } catch (err) {
    console.error('[attendanceService] upsertAttendanceLog error:', err)
  }
}

/**
 * Fetches today's attendance log for the given employee from Firestore.
 *
 * @param {string} uid - Firebase user uid
 * @returns {Promise<object|null>} Attendance log data or null
 */
export const getTodayAttendanceLog = async (uid) => {
  if (IS_MOCK || !uid) return null

  try {
    const date = new Date().toISOString().split('T')[0]
    const docId = `${date}_${uid}`
    const ref = doc(db, 'attendanceLogs', docId)
    const snap = await getDoc(ref)

    if (snap.exists()) {
      return snap.data()
    }
    return null
  } catch (err) {
    console.error('[attendanceService] getTodayAttendanceLog error:', err)
    return null
  }
}

/**
 * Fetches all attendance logs for the given employee from Firestore.
 * Returns an object mapping date ("YYYY-MM-DD") -> record object.
 *
 * @param {string} uid - Firebase user uid
 * @returns {Promise<Record<string, object>>}
 */
export const getUserMonthlyAttendance = async (uid) => {
  if (IS_MOCK || !uid) return {}

  try {
    const q = query(collection(db, 'attendanceLogs'), where('uid', '==', uid))
    const snap = await getDocs(q)
    const recordMap = {}
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data()
      if (data.date) {
        recordMap[data.date] = data
      }
    })
    return recordMap
  } catch (err) {
    console.error('[attendanceService] getUserMonthlyAttendance error:', err)
    return {}
  }
}


