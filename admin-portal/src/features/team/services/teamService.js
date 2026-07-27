import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Fetch all employee profiles from Firestore /employees
 */
export const getEmployees = async () => {
  try {
    const snap = await getDocs(collection(db, 'employees'))
    return snap.docs.map((d) => ({ uid: d.id, employeeId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching employees from Firestore:', err)
    return []
  }
}

/**
 * Fetch all departments from Firestore /departments
 */
export const getDepartments = async () => {
  try {
    const snap = await getDocs(collection(db, 'departments'))
    return snap.docs.map((d) => ({ deptId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching departments from Firestore:', err)
    return []
  }
}

/**
 * Fetch all leave requests from Firestore /leaveRequests
 */
export const getLeaveRequests = async () => {
  try {
    const snap = await getDocs(collection(db, 'leaveRequests'))
    return snap.docs.map((d) => ({ leaveId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching leave requests from Firestore:', err)
    return []
  }
}

/**
 * Add a new employee to Firestore
 */
export const createEmployee = async (employeeData) => {
  try {
    const uid = `emp_${Date.now()}`
    await setDoc(doc(db, 'employees', uid), {
      ...employeeData,
      uid,
      createdAt: serverTimestamp(),
    })
    return { uid, employeeId: uid, ...employeeData }
  } catch (err) {
    console.error('Error creating employee in Firestore:', err)
    const uid = `emp_${Date.now()}`
    return { uid, employeeId: uid, ...employeeData }
  }
}

/**
 * Delete an employee from Firestore
 */
export const deleteEmployeeFromDb = async (employeeId) => {
  try {
    if (!employeeId) return
    await deleteDoc(doc(db, 'employees', employeeId))
  } catch (err) {
    console.error('Error deleting employee from Firestore:', err)
  }
}

/**
 * Create a leave request in Firestore /leaveRequests
 */
export const createLeaveRequest = async (leaveData) => {
  try {
    const leaveId = `leave_${Date.now()}`
    await setDoc(doc(db, 'leaveRequests', leaveId), {
      ...leaveData,
      leaveId,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    return { leaveId, ...leaveData, status: 'pending' }
  } catch (err) {
    console.error('Error creating leave request in Firestore:', err)
    const leaveId = `leave_${Date.now()}`
    return { leaveId, ...leaveData, status: 'pending' }
  }
}

/**
 * Update leave request status in Firestore
 */
export const updateLeaveStatusInDb = async (leaveId, newStatus) => {
  try {
    await updateDoc(doc(db, 'leaveRequests', leaveId), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.error('Error updating leave status in Firestore:', err)
  }
}

/**
 * Fetch attendance logs from Firestore /attendance
 */
export const getAttendanceRecords = async () => {
  try {
    const snap = await getDocs(collection(db, 'attendance'))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching attendance from Firestore:', err)
    return []
  }
}

/**
 * Record clock in/out in Firestore
 */
export const recordAttendanceInDb = async (attendanceData) => {
  try {
    const docRef = await addDoc(collection(db, 'attendance'), {
      ...attendanceData,
      timestamp: serverTimestamp(),
    })
    return { id: docRef.id, ...attendanceData }
  } catch (err) {
    console.error('Error recording attendance in Firestore:', err)
    return { id: `att_${Date.now()}`, ...attendanceData }
  }
}
