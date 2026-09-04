import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export async function notifyEmployeeCheckBalance({ employee, month, year, author }) {
  const ids = new Set()
  if (employee?.uid) ids.add(employee.uid)
  if (employee?.employeeId) ids.add(employee.employeeId)
  ids.delete(undefined)
  ids.delete(null)
  ids.delete('')

  if (ids.size === 0) return

  const monthLabel = `${MONTHS[Number(month) - 1]} ${year}`
  const nowIso = new Date().toISOString()
  const batch = writeBatch(db)

  ids.forEach((empId) => {
    const notifDocRef = doc(collection(db, 'notifications', empId, 'items'))
    batch.set(notifDocRef, {
      notificationId: notifDocRef.id,
      title: 'Check your balance',
      message: `Check your balance. Salary for ${monthLabel} has been sent.`,
      type: 'payslip',
      priority: 'info',
      isRead: false,
      link: '/payslips',
      targetUid: employee.uid || empId,
      author: author || 'Admin',
      month: Number(month),
      year: Number(year),
      createdAt: nowIso,
      serverCreatedAt: serverTimestamp(),
    })
  })

  await batch.commit()
}
