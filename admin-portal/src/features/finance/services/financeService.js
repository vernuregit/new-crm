import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Fetch all invoices from Firestore
 */
export const getInvoices = async () => {
  try {
    const snap = await getDocs(collection(db, 'invoices'))
    return snap.docs.map((d) => ({ invoiceId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching invoices from Firestore:', err)
    return []
  }
}

/**
 * Create an invoice document in Firestore
 */
export const createInvoice = async (invoiceData) => {
  try {
    const docRef = await addDoc(collection(db, 'invoices'), {
      ...invoiceData,
      createdAt: new Date().toISOString(),
    })
    return { invoiceId: docRef.id, ...invoiceData }
  } catch (err) {
    console.error('Error creating invoice in Firestore:', err)
    return { invoiceId: `inv_${Date.now()}`, ...invoiceData }
  }
}

/**
 * Update invoice status in Firestore
 */
export const updateInvoiceStatusInDb = async (invoiceId, status) => {
  try {
    if (!invoiceId) return
    const isPaid = status === 'paid'
    await updateDoc(doc(db, 'invoices', invoiceId), {
      status,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Error updating invoice status in Firestore:', err)
  }
}

/**
 * Delete an invoice from Firestore
 */
export const deleteInvoiceFromDb = async (invoiceId) => {
  try {
    if (!invoiceId) return
    await deleteDoc(doc(db, 'invoices', invoiceId))
  } catch (err) {
    console.error('Error deleting invoice from Firestore:', err)
  }
}

/**
 * Fetch expenses from Firestore
 */
export const getExpenses = async () => {
  try {
    const snap = await getDocs(collection(db, 'expenses'))
    return snap.docs.map((d) => ({ expenseId: d.id, ...d.data() }))
  } catch (err) {
    console.error('Error fetching expenses from Firestore:', err)
    return []
  }
}

/**
 * Create an expense in Firestore
 */
export const createExpense = async (expenseData) => {
  try {
    const docRef = await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      createdAt: new Date().toISOString(),
    })
    return { expenseId: docRef.id, ...expenseData }
  } catch (err) {
    console.error('Error creating expense in Firestore:', err)
    return { expenseId: `exp_${Date.now()}`, ...expenseData }
  }
}
