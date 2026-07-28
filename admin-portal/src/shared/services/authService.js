import { initializeApp, deleteApp, getApp } from 'firebase/app'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  getAuth,
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
    return { orgId: 'org_demo', role: 'owner', tier: 'company' }
  }
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

/**
 * Fetch a user document from Firestore /users/{uid}
 */
export const getUserDoc = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid)
    const snap = await getDoc(userRef)
    if (snap.exists()) {
      return snap.data()
    }
  } catch (err) {
    console.warn('Error fetching user document:', err.message)
  }
  return null
}

const tempConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'mock_api_key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'business-os-dev.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'business-os-dev',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'business-os-dev.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
}

/**
 * Programmatically create a Client Auth user & Firestore profile without logging out the active admin.
 */
export const createClientAccount = async (email, password, displayName, companyName, phone) => {
  if (import.meta.env.VITE_FIREBASE_API_KEY === 'mock_api_key_dev') {
    // Return dummy data in local mock mode
    const mockUid = `client_${Date.now()}`
    const mockData = {
      uid: mockUid,
      email,
      displayName,
      companyName,
      phoneNumber: phone || null,
      role: 'client',
      tier: 'client',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const userRef = doc(db, 'users', mockUid)
    await setDoc(userRef, mockData)
    return mockData
  }

  let secondaryApp
  try {
    secondaryApp = initializeApp(tempConfig, 'ClientCreationApp')
  } catch (e) {
    secondaryApp = getApp('ClientCreationApp')
  }
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const user = userCred.user

    const clientData = {
      uid: user.uid,
      email: user.email,
      displayName: displayName || email.split('@')[0],
      companyName,
      phoneNumber: phone || null,
      role: 'client',
      tier: 'client',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const userRef = doc(db, 'users', user.uid)
    await setDoc(userRef, clientData)

    await signOut(secondaryAuth)
    await deleteApp(secondaryApp)
    return clientData
  } catch (err) {
    try {
      await deleteApp(secondaryApp)
    } catch (_) { }
    throw err
  }
}

/**
 * Programmatically create an Employee Auth user & Firestore profile without logging out the active admin.
 */
export const createEmployeeAccount = async (email, password, displayName, roleName, departmentName, phone) => {
  const employeePayload = {
    displayName,
    email,
    roleName: roleName || 'Software Specialist',
    departmentName: departmentName || 'Engineering & Product',
    phoneNumber: phone || ' ',
    skills: ['Productivity'],
    status: 'active',
    joinedAt: new Date().toISOString().split('T')[0],
    utilizationRate: 85,
  }

  if (import.meta.env.VITE_FIREBASE_API_KEY === 'mock_api_key_dev') {
    const mockUid = `emp_${Date.now()}`
    const mockData = {
      uid: mockUid,
      ...employeePayload,
      role: 'employee',
      tier: 'company',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'users', mockUid), mockData)
    await setDoc(doc(db, 'employees', mockUid), mockData)
    return mockData
  }

  let secondaryApp
  try {
    secondaryApp = initializeApp(tempConfig, 'EmployeeCreationApp')
  } catch (e) {
    secondaryApp = getApp('EmployeeCreationApp')
  }
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    const user = userCred.user

    const mockData = {
      uid: user.uid,
      ...employeePayload,
      role: 'employee',
      tier: 'company',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Write to /users/{uid} for Auth matching
    await setDoc(doc(db, 'users', user.uid), mockData)
    // Write to /employees/{uid} so they show up in employee directory
    await setDoc(doc(db, 'employees', user.uid), mockData)

    await signOut(secondaryAuth)
    await deleteApp(secondaryApp)
    return mockData
  } catch (err) {
    try {
      await deleteApp(secondaryApp)
    } catch (_) { }
    throw err
  }
}
