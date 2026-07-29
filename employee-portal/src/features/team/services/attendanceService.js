import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
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
