import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'

/**
 * Fetch onboarding details (signatures, KYC documents, billing) for a specific client
 */
export const getClientOnboardingAdmin = async (clientId) => {
  if (!clientId) return null

  try {
    const onboardingRef = doc(db, 'clientOnboarding', clientId)
    const snap = await getDoc(onboardingRef)
    if (snap.exists()) {
      return snap.data()
    }

    // Check fallback in users doc
    const userRef = doc(db, 'users', clientId)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      const uData = userSnap.data()
      return {
        uid: clientId,
        email: uData.email,
        companyName: uData.companyName || '',
        displayName: uData.displayName || '',
        onboardingStatus: uData.onboardingStatus || 'pending_documents',
        rejectionReason: uData.rejectionReason || null,
        agreements: uData.agreements || {},
        documents: uData.documents || {},
        billingInfo: uData.billingInfo || null,
      }
    }
  } catch (err) {
    console.warn('Error fetching onboarding doc in admin:', err.message)
  }

  // Local storage fallback for dev/demo sync
  try {
    const localData = localStorage.getItem(`onboarding_${clientId}`)
    if (localData) {
      return JSON.parse(localData)
    }
  } catch {
    // ignore
  }

  return null
}

/**
 * Approve client onboarding submission, granting full workspace access
 */
export const approveClientOnboarding = async (clientId, adminUid = 'admin') => {
  const updates = {
    onboardingStatus: 'approved',
    status: 'active',
    approvedAt: new Date().toISOString(),
    approvedBy: adminUid,
    rejectionReason: null,
    updatedAt: new Date().toISOString(),
  }

  try {
    const onboardingRef = doc(db, 'clientOnboarding', clientId)
    await setDoc(onboardingRef, updates, { merge: true })

    const userRef = doc(db, 'users', clientId)
    await updateDoc(userRef, {
      onboardingStatus: 'approved',
      status: 'active',
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('Error approving client onboarding (offline fallback):', err.message)
  }

  // Safe update localStorage for seamless demo verification
  try {
    localStorage.setItem(`onboarding_status_${clientId}`, 'approved')
    const localData = localStorage.getItem(`onboarding_${clientId}`)
    if (localData) {
      const parsed = JSON.parse(localData)
      localStorage.setItem(
        `onboarding_${clientId}`,
        JSON.stringify({ ...parsed, ...updates })
      )
    }
  } catch {
    // ignore
  }

  return true
}

/**
 * Request re-submission with feedback notes from compliance admin
 */
export const rejectClientOnboarding = async (clientId, rejectionReason, adminUid = 'admin') => {
  const updates = {
    onboardingStatus: 'rejected',
    rejectionReason: rejectionReason || 'Please review and re-submit the required documents.',
    rejectedAt: new Date().toISOString(),
    rejectedBy: adminUid,
    updatedAt: new Date().toISOString(),
  }

  try {
    const onboardingRef = doc(db, 'clientOnboarding', clientId)
    await setDoc(onboardingRef, updates, { merge: true })

    const userRef = doc(db, 'users', clientId)
    await updateDoc(userRef, {
      onboardingStatus: 'rejected',
      rejectionReason: updates.rejectionReason,
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('Error rejecting client onboarding (offline fallback):', err.message)
  }

  try {
    localStorage.setItem(`onboarding_status_${clientId}`, 'rejected')
    const localData = localStorage.getItem(`onboarding_${clientId}`)
    if (localData) {
      const parsed = JSON.parse(localData)
      localStorage.setItem(
        `onboarding_${clientId}`,
        JSON.stringify({ ...parsed, ...updates })
      )
    }
  } catch {
    // ignore
  }

  return true
}
