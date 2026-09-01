import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth, db } from './firebaseService'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const googleProvider = new GoogleAuthProvider()

/**
 * Sign in with email and password
 */
export const loginWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

/**
 * Sign up with email, password, and display name
 */
export const signupWithEmail = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  if (displayName) {
    await updateProfile(user, { displayName })
  }

  // Create or update user doc in Firestore /users/{uid}
  await ensureUserDocExists(user)

  return user
}

/**
 * Sign in with Google OAuth popup
 */
export const loginWithGoogle = async () => {
  const userCredential = await signInWithPopup(auth, googleProvider)
  const user = userCredential.user
  await ensureUserDocExists(user)
  return user
}

/**
 * Sign out current user
 */
export const logoutUser = async () => {
  await signOut(auth)
}

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email)
}

/**
 * Fetch fresh ID token result and return decoded custom claims
 */
export const fetchCustomClaims = async (user, forceRefresh = false) => {
  if (!user) return null
  try {
    const tokenResult = await user.getIdTokenResult(forceRefresh)
    return tokenResult.claims || {}
  } catch (err) {
    console.warn('Could not fetch custom claims (mock/offline mode):', err.message)
    return { orgId: 'org_demo', role: 'employee', tier: 'company' }
  }
}

const NAME_PLACEHOLDERS = new Set(['employee', 'employee staff', 'team staff', 'unknown', 'user'])

function isUsableDisplayName(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—' || trimmed === '-') return false
  return !NAME_PLACEHOLDERS.has(trimmed.toLowerCase())
}

function pickDisplayName(...values) {
  for (const value of values) {
    if (isUsableDisplayName(value)) return value.trim()
  }
  return ''
}

/**
 * Fetch a user document from Firestore /users/{uid} merged with /employees/{uid}.
 * /users is checked first for auth fields, but a missing name is filled from the employee profile.
 */
export const getUserDoc = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid)
    const empRef = doc(db, 'employees', uid)
    const [snap, empSnap] = await Promise.all([getDoc(userRef), getDoc(empRef)])
    const userData = snap.exists() ? snap.data() : null
    const empData = empSnap.exists() ? empSnap.data() : null
    if (!userData && !empData) return null

    const merged = { ...(empData || {}), ...(userData || {}), uid: userData?.uid || empData?.uid || uid }
    const emailLocal = String(merged.email || '').split('@')[0]
    merged.displayName =
      pickDisplayName(
        userData?.displayName,
        empData?.displayName,
        empData?.name,
        empData?.fullName,
        userData?.name,
        emailLocal
      ) || merged.displayName || ''
    if (!merged.departmentName && empData?.departmentName) {
      merged.departmentName = empData.departmentName
    }
    if (!merged.role) merged.role = 'employee'

    const userQuoteAt = Date.parse(userData?.quoteUpdatedAt || '') || 0
    const empQuoteAt = Date.parse(empData?.quoteUpdatedAt || '') || 0
    const userHasQuote = !!(userData && ('quote' in userData || 'proverb' in userData))
    const empHasQuote = !!(empData && ('quote' in empData || 'proverb' in empData))
    const useEmpQuote = empHasQuote && (!userHasQuote || empQuoteAt > userQuoteAt)
    const quoteSource = useEmpQuote ? empData : userData
    if (quoteSource && ('quote' in quoteSource || 'proverb' in quoteSource)) {
      const text = quoteSource.quote || quoteSource.proverb || ''
      merged.quote = text
      merged.proverb = text
      merged.quoteUpdatedAt = quoteSource.quoteUpdatedAt || userData?.quoteUpdatedAt || empData?.quoteUpdatedAt
    }

    return merged
  } catch (err) {
    console.warn('Error fetching user document:', err.message)
  }
  return null
}

/**
 * Ensure user document exists in /users/{uid}
 */
export const ensureUserDocExists = async (user) => {
  if (!user) return
  if (import.meta.env.VITE_FIREBASE_API_KEY === 'mock_api_key_dev') return

  try {
    const userRef = doc(db, 'users', user.uid)
    const snap = await getDoc(userRef)

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || null,
        phoneNumber: user.phoneNumber || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        invitedBy: null,
        fcmTokens: [],
        notificationPrefs: {
          email: true,
          push: true,
          inApp: true,
        },
        lastSeenAt: serverTimestamp(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        locale: navigator.language || 'en-US',
      })
    } else {
      await setDoc(
        userRef,
        {
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }
  } catch (err) {
    console.warn('Firestore offline or dev mock mode active:', err.message)
  }
}
