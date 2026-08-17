import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebaseService'

export const DEFAULT_AGREEMENTS = [
  {
    id: 'msa',
    title: 'Master Services Agreement (MSA)',
    required: true,
    summary: 'Governing legal framework, deliverables warranty, liability limitations, and confidentiality terms.',
    content: `MASTER SERVICES AGREEMENT (MSA)
Effective Date: Upon Digital Signature
Parties: The Service Provider & The Client Entity

1. SCOPE & SERVICES
The Service Provider agrees to deliver professional services, technical consulting, and digital deliverables as specified in applicable Statements of Work (SOWs) executed under this Agreement.

2. INTELLECTUAL PROPERTY & OWNERSHIP
Upon receipt of full payment for each respective milestone, all custom deliverables, codebases, and assets created specifically for the Client shall become the exclusive property of the Client, excluding pre-existing frameworks and standard libraries.

3. CONFIDENTIALITY & DATA INTEGRITY
Both parties agree to hold in strict confidence all non-public information, system architectures, credentials, and business workflows shared during the duration of this engagement.

4. WARRANTIES & LIMITATION OF LIABILITY
Services are delivered in accordance with modern industry standards. Neither party shall be liable for indirect, incidental, or consequential damages arising from standard project execution.

5. TERMINATION
Either party may terminate an active engagement with thirty (30) days written notice, provided all outstanding billable milestones completed prior to termination are settled.`,
  },
  {
    id: 'nda',
    title: 'Mutual Non-Disclosure Agreement (NDA)',
    required: true,
    summary: 'Strict protection for trade secrets, proprietary algorithms, API keys, and customer data.',
    content: `MUTUAL NON-DISCLOSURE AGREEMENT (NDA)

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" refers to any proprietary data, customer lists, architectural diagrams, technical source code, business plans, and financial terms disclosed by either party.

2. OBLIGATIONS OF RECEIVING PARTY
The receiving party agrees to safeguard confidential materials with the same degree of care used for its own sensitive data (and no less than reasonable care), restricting access exclusively to personnel with a strict need-to-know.

3. DURATION & RETURN OF DATA
This obligation survives for a period of three (3) years from disclosure. Upon project completion or termination, all client data and credentials will be purged or securely returned.`,
  },
  {
    id: 'sow',
    title: 'Statement of Work & Deliverable Terms (SOW)',
    required: true,
    summary: 'Standardized deliverable sign-off terms, revision policies, and payment milestone commitments.',
    content: `STATEMENT OF WORK (SOW) & ACCEPTANCE TERMS

1. DELIVERABLE ACCEPTANCE CRITERIA
Each deliverable milestone deployed to staging shall have an inspection period of ten (10) business days for client review, QA validation, and formal sign-off.

2. PAYMENT & INVOICING SCHEDULE
Invoices issued through the Client Portal are payable within fourteen (14) days. Deliverable releases and production deployments are tied to completed milestone settlements.

3. CHANGE REQUEST MANAGEMENT
Any scope modifications outside approved milestone specifications shall be documented in a mutual Change Order before development commences.`,
  },
]

export const REQUIRED_DOCUMENT_TYPES = [
  {
    id: 'incorporationCertificate',
    name: 'Certificate of Incorporation / Business License',
    description: 'Official government-issued registration or certificate proving company entity status.',
    required: true,
    acceptedFormats: '.pdf, .png, .jpg, .jpeg',
  },
  {
    id: 'taxDocument',
    name: 'Tax ID / W-9 / VAT / GST Registration',
    description: 'Official tax compliance document or VAT/GST tax identification certificate.',
    required: true,
    acceptedFormats: '.pdf, .png, .jpg, .jpeg',
  },
  {
    id: 'signatoryId',
    name: 'Authorized Signatory Photo ID',
    description: 'Government photo ID (Passport or Driver’s License) of the person signing legal agreements.',
    required: true,
    acceptedFormats: '.pdf, .png, .jpg, .jpeg',
  },
]

/**
 * Upload an actual document file to Firebase Storage if available, returning download URL
 */
export const uploadDocumentToStorage = async (uid, docId, file) => {
  if (!file || !uid) return null
  try {
    const fileExt = file.name.split('.').pop() || 'pdf'
    const storageRef = ref(storage, `clients/${uid}/documents/${docId}_${Date.now()}.${fileExt}`)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  } catch (err) {
    console.warn('Storage upload unavailable or offline mode:', err.message)
    return null
  }
}

/**
 * Fetch client onboarding document from Firestore /clientOnboarding/{uid} or /users/{uid}
 */
export const getClientOnboardingDoc = async (uid) => {
  if (!uid) return null
  try {
    const onboardingRef = doc(db, 'clientOnboarding', uid)
    const snap = await getDoc(onboardingRef)
    if (snap.exists()) {
      return snap.data()
    }

    // Fallback: check users collection
    const userRef = doc(db, 'users', uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      const uData = userSnap.data()
      return {
        uid,
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
    console.warn('Could not fetch client onboarding doc (mock/offline fallback):', err.message)
  }

  // Local storage fallback for offline/demo testing
  try {
    const localSaved = localStorage.getItem(`onboarding_${uid}`)
    if (localSaved) {
      return JSON.parse(localSaved)
    }
  } catch {
    // ignore
  }

  return {
    uid,
    onboardingStatus: 'pending_documents',
    agreements: {},
    documents: {},
    billingInfo: null,
  }
}

/**
 * Deeply clean object for Firestore, ensuring only valid JSON primitives and no DOM objects/undefined
 */
const deepCleanForFirestore = (obj) => {
  if (obj === null || obj === undefined) {
    return null
  }
  if (typeof obj !== 'object') {
    return obj
  }
  if (Array.isArray(obj)) {
    return obj.map(deepCleanForFirestore)
  }

  const cleaned = {}
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || typeof val === 'function') {
      continue
    }
    if (typeof File !== 'undefined' && val instanceof File) {
      cleaned[key] = val.name
    } else if (typeof Blob !== 'undefined' && val instanceof Blob) {
      cleaned[key] = 'blob'
    } else if (typeof val === 'object' && val !== null) {
      cleaned[key] = deepCleanForFirestore(val)
    } else {
      cleaned[key] = val
    }
  }
  return cleaned
}

/**
 * Sanitize document objects to prevent exceeding Firestore 1MB or LocalStorage 5MB quota
 */
const sanitizeSubmissionPayload = (data) => {
  const sanitizedDocs = {}
  if (data.documents && typeof data.documents === 'object') {
    for (const [key, docVal] of Object.entries(data.documents)) {
      if (docVal && typeof docVal === 'object') {
        sanitizedDocs[key] = {
          docId: String(docVal.docId || key),
          fileName: String(docVal.fileName || 'document.pdf'),
          fileSize: String(docVal.fileSize || '1 MB'),
          fileType: String(docVal.fileType || 'application/pdf'),
          uploadedAt: String(docVal.uploadedAt || new Date().toISOString()),
          timestampFormatted: String(docVal.timestampFormatted || new Date().toLocaleString()),
          status: String(docVal.status || 'submitted'),
          fileUrl: typeof docVal.fileUrl === 'string' ? docVal.fileUrl : '',
        }
      }
    }
  }

  const sanitizedAgreements = {}
  if (data.agreements && typeof data.agreements === 'object') {
    for (const [key, agVal] of Object.entries(data.agreements)) {
      if (agVal && typeof agVal === 'object') {
        sanitizedAgreements[key] = {
          signed: Boolean(agVal.signed),
          signatoryName: String(agVal.signatoryName || ''),
          signatoryTitle: String(agVal.signatoryTitle || ''),
          mode: String(agVal.mode || 'draw'),
          signatureDataUrl: String(agVal.signatureDataUrl || ''),
          signedAt: String(agVal.signedAt || new Date().toISOString()),
          timestampFormatted: String(agVal.timestampFormatted || new Date().toLocaleString()),
        }
      }
    }
  }

  const sanitizedBilling = data.billingInfo && typeof data.billingInfo === 'object' ? {
    billingEmail: String(data.billingInfo.billingEmail || ''),
    billingAddress: String(data.billingInfo.billingAddress || ''),
    taxId: String(data.billingInfo.taxId || ''),
    paymentMethod: String(data.billingInfo.paymentMethod || 'ach'),
    signerPhone: String(data.billingInfo.signerPhone || ''),
  } : null

  return {
    companyName: String(data.companyName || ''),
    agreements: sanitizedAgreements,
    documents: sanitizedDocs,
    billingInfo: sanitizedBilling,
  }
}

/**
 * Submit full onboarding package with signatures, documents, and billing info
 */
export const submitClientOnboarding = async (uid, data) => {
  const sanitized = sanitizeSubmissionPayload(data)

  const submissionRecord = {
    ...sanitized,
    uid: String(uid),
    onboardingStatus: 'pending_approval',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const firestoreCleanedRecord = deepCleanForFirestore(submissionRecord)

  try {
    // Save to clientOnboarding collection
    const onboardingRef = doc(db, 'clientOnboarding', uid)
    await setDoc(onboardingRef, firestoreCleanedRecord, { merge: true })

    // Also update users collection
    const userRef = doc(db, 'users', uid)
    await updateDoc(userRef, {
      onboardingStatus: 'pending_approval',
      companyName: sanitized.companyName || '',
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    console.warn('Firestore write notice:', err.message)
  }

  // Safe update to localStorage (guarded against QuotaExceededError)
  try {
    // Save lightweight version without huge base64 strings if storage is near limit
    localStorage.setItem(`onboarding_status_${uid}`, 'pending_approval')
    try {
      localStorage.setItem(`onboarding_${uid}`, JSON.stringify(firestoreCleanedRecord))
    } catch {
      // If full record exceeds quota, strip large URLs and save essential status
      const lightDocs = {}
      for (const [k, v] of Object.entries(sanitized.documents)) {
        lightDocs[k] = { ...v, fileUrl: '' }
      }
      const lightRecord = { ...firestoreCleanedRecord, documents: lightDocs }
      localStorage.setItem(`onboarding_${uid}`, JSON.stringify(lightRecord))
    }
  } catch (storageErr) {
    console.warn('LocalStorage notice (non-fatal):', storageErr.message)
  }

  return submissionRecord
}
