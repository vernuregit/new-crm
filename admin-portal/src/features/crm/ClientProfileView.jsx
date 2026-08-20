import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { getUserDoc } from '../../shared/services/authService'
import { updateClientInDb } from './services/clientService'
import {
  getClientOnboardingAdmin,
  approveClientOnboarding,
  rejectClientOnboarding,
} from './services/clientOnboardingService'
import { db, auth, storage } from '../../shared/services/firebaseService'
import { sendPasswordResetEmail } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { ref, updateMetadata, getDownloadURL } from 'firebase/storage'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  Lock,
  User,
  ShieldCheck,
  Save,
  CheckCircle,
  FileText,
  Briefcase,
  AlertCircle,
  FileCheck2,
  UploadCloud,
  Check,
  XCircle,
  Clock,
  Download,
  AlertTriangle,
  Eye,
  X,
  Printer,
  FileCode,
  Shield,
  Loader2,
} from 'lucide-react'

const LocalSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
)

const AGREEMENT_TEMPLATES = {
  msa: {
    title: 'Master Services Agreement (MSA)',
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
  nda: {
    title: 'Mutual Non-Disclosure Agreement (NDA)',
    content: `MUTUAL NON-DISCLOSURE AGREEMENT (NDA)

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" refers to any proprietary data, customer lists, architectural diagrams, technical source code, business plans, and financial terms disclosed by either party.

2. OBLIGATIONS OF RECEIVING PARTY
The receiving party agrees to safeguard confidential materials with the same degree of care used for its own sensitive data (and no less than reasonable care), restricting access exclusively to personnel with a strict need-to-know.

3. DURATION & RETURN OF DATA
This obligation survives for a period of three (3) years from disclosure. Upon project completion or termination, all client data and credentials will be purged or securely returned.`,
  },
  sow: {
    title: 'Statement of Work & Deliverable Terms (SOW)',
    content: `STATEMENT OF WORK (SOW) & ACCEPTANCE TERMS

1. DELIVERABLE ACCEPTANCE CRITERIA
Each deliverable milestone deployed to staging shall have an inspection period of ten (10) business days for client review, QA validation, and formal sign-off.

2. PAYMENT & INVOICING SCHEDULE
Invoices issued through the Client Portal are payable within fourteen (14) days. Deliverable releases and production deployments are tied to completed milestone settlements.

3. CHANGE REQUEST MANAGEMENT
Any scope modifications outside approved milestone specifications shall be documented in a mutual Change Order before development commences.`,
  },
}

export const ClientProfileView = () => {
  const { clientId } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [onboarding, setOnboarding] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  // Active Tab: 'compliance' | 'details'
  const [activeTab, setActiveTab] = useState('compliance')

  // Edit fields
  const [displayName, setDisplayName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')

  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [previewDoc, setPreviewDoc] = useState(null) // { title, fileName, fileUrl, fileSize }
  const [previewAgreement, setPreviewAgreement] = useState(null) // { id, title, sigRecord }
  const [downloadingDocId, setDownloadingDocId] = useState(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const triggerBlobDownload = (blob, fileName) => {
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fileName || 'document'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000)
  }

  const handleDownloadFile = async (docId, fileUrl, fileName = 'document') => {
    if (!fileUrl) return
    try {
      setDownloadingDocId(docId)

      // 1. Direct download for base64 data URLs
      if (fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(',')
        const mimeMatch = parts[0].match(/:(.*?);/)
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
        const byteString = atob(parts[1])
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        const blob = new Blob([ab], { type: mime })
        triggerBlobDownload(blob, fileName)
        return
      }

      // 2. If it's a Firebase Storage URL, ensure attachment header is set on metadata
      if (fileUrl.includes('firebasestorage.googleapis.com') || fileUrl.startsWith('gs://')) {
        try {
          const cleanName = (fileName || 'compliance_document').replace(/[^a-zA-Z0-9._-]/g, '_')
          const storageRef = ref(storage, fileUrl)
          
          // Update the object's metadata in Firebase Storage so the server sends 'Content-Disposition: attachment'
          await updateMetadata(storageRef, {
            contentDisposition: `attachment; filename="${cleanName}"`,
          })
          
          const freshUrl = await getDownloadURL(storageRef)
          
          // Trigger download using an invisible iframe (completely bypasses CORS and browser tab navigation)
          const iframe = document.createElement('iframe')
          iframe.style.position = 'fixed'
          iframe.style.top = '-9999px'
          iframe.style.left = '-9999px'
          iframe.style.width = '1px'
          iframe.style.height = '1px'
          iframe.style.opacity = '0'
          iframe.src = freshUrl
          document.body.appendChild(iframe)
          
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 6000)
          return
        } catch (metaErr) {
          console.warn('Firebase Storage metadata update failed, trying direct iframe download:', metaErr)
        }
      }

      // 3. Fallback: invisible iframe download
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      iframe.style.left = '-9999px'
      iframe.style.width = '1px'
      iframe.style.height = '1px'
      iframe.style.opacity = '0'
      iframe.src = fileUrl
      document.body.appendChild(iframe)
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 6000)
    } catch (err) {
      console.warn('Download handler error:', err)
      window.open(fileUrl, '_blank')
    } finally {
      setTimeout(() => setDownloadingDocId(null), 1000)
    }
  }

  const loadClientData = async () => {
    try {
      setLoading(true)
      const clientDoc = await getUserDoc(clientId)
      if (!clientDoc) {
        setError('Client account not found in database.')
        setLoading(false)
        return
      }

      setClient(clientDoc)
      setDisplayName(clientDoc.displayName || '')
      setCompanyName(clientDoc.companyName || '')
      setPhoneNumber(clientDoc.phoneNumber || '')
      setStatus(clientDoc.status || 'active')
      setNotes(clientDoc.notes || '')

      // Load Onboarding & Compliance Documents
      const obData = await getClientOnboardingAdmin(clientId)
      setOnboarding(obData)

      // Fetch projects
      const projSnap = await getDocs(
        query(collection(db, 'projects'), where('clientId', '==', clientId))
      )
      setProjects(projSnap.docs.map((d) => ({ projectId: d.id, ...d.data() })))

      // Fetch invoices
      const invSnap = await getDocs(
        query(collection(db, 'invoices'), where('clientId', '==', clientId))
      )
      setInvoices(invSnap.docs.map((d) => ({ invoiceId: d.id, ...d.data() })))
    } catch (err) {
      console.error(err)
      setError('Failed to fetch client details from database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClientData()
  }, [clientId])

  const handleApproveClient = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await approveClientOnboarding(clientId)
      setSuccess(`Client "${displayName || companyName}" has been APPROVED! Full portal access is unlocked.`)
      setStatus('active')
      setOnboarding((prev) => ({ ...prev, onboardingStatus: 'approved' }))
      loadClientData()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to approve client.')
    } finally {
      setSaving(false)
    }
  }

  const handleRejectClient = async (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) {
      setError('Please provide a reason or instruction for the client.')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await rejectClientOnboarding(clientId, rejectReason.trim())
      setSuccess('Re-submission request sent to client.')
      setShowRejectModal(false)
      setOnboarding((prev) => ({ ...prev, onboardingStatus: 'rejected', rejectionReason: rejectReason.trim() }))
      loadClientData()
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to request re-submission.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await updateClientInDb(clientId, {
        displayName,
        companyName,
        phoneNumber,
        status,
        notes,
      })
      setSuccess('Client profile updated successfully.')
    } catch (err) {
      console.error(err)
      setError('Failed to update client profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendResetEmail = async () => {
    if (!client?.email) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (import.meta.env.VITE_FIREBASE_API_KEY !== 'mock_api_key_dev') {
        await sendPasswordResetEmail(auth, client.email)
        setSuccess(`Password reset email sent to ${client.email}!`)
      } else {
        setSuccess(`[Mock Mode] Simulated password reset email sent to ${client.email}`)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to send password reset email.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LocalSpinner />
  }

  const obStatus = onboarding?.onboardingStatus || client?.onboardingStatus || 'pending_documents'

  return (
    <div className="space-y-6 w-full text-slate-900 dark:text-slate-100">
      {/* Header with Back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/crm/contacts"
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <PageHeader
            title={`Manage Client: ${client?.displayName || client?.companyName || 'Client User'}`}
            description={`Compliance verification, signed contracts, and account settings for ${client?.companyName || 'Corporate Client'}`}
          />
        </div>

        {/* Status Badge */}
        <div>
          {obStatus === 'approved' ? (
            <Badge variant="success" className="px-3 py-1.5 text-xs flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Approved & Active
            </Badge>
          ) : obStatus === 'pending_approval' ? (
            <Badge variant="warning" className="px-3 py-1.5 text-xs flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border-amber-500/30">
              <Clock className="w-4 h-4" /> Documents Pending Approval
            </Badge>
          ) : obStatus === 'rejected' ? (
            <Badge variant="danger" className="px-3 py-1.5 text-xs flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Re-submission Requested
            </Badge>
          ) : (
            <Badge variant="neutral" className="px-3 py-1.5 text-xs flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> Awaiting Client Documents
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'compliance'
              ? 'bg-indigo-600/15 text-indigo-500 border border-indigo-500/30'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Compliance & Signed Agreements
        </button>
        <button
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'details'
              ? 'bg-indigo-600/15 text-indigo-500 border border-indigo-500/30'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" /> Profile & Account Settings
        </button>
      </div>

      {/* TAB 1: COMPLIANCE & ONBOARDING DOCUMENTS */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Admin Approval Decision Bar */}
          <Card className="p-5 border-slate-200 dark:border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" /> Admin Onboarding Gate Decision
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Inspect the legal e-signatures and KYC verification documents below before unlocking workspace access.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {obStatus !== 'approved' ? (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowRejectModal(true)}
                    disabled={saving}
                    icon={XCircle}
                  >
                    Request Re-upload
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleApproveClient}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20"
                    icon={Check}
                  >
                    Approve Client Account
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                  <Check className="w-4 h-4" /> Workspace Access Active
                </div>
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Executed Legal Agreements */}
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-indigo-500" /> Executed Contracts & E-Signatures
                </h4>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'msa', name: 'Master Services Agreement (MSA)' },
                  { id: 'nda', name: 'Mutual Non-Disclosure Agreement (NDA)' },
                  { id: 'sow', name: 'Statement of Work & Terms (SOW)' },
                ].map((ag) => {
                  const sig = onboarding?.agreements?.[ag.id]
                  return (
                    <div
                      key={ag.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{ag.name}</span>
                        {sig?.signed ? (
                          <Badge variant="success" className="text-[10px]">Signed & Verified</Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px]">Pending</Badge>
                        )}
                      </div>

                      {sig?.signed ? (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                          <div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                              Signatory: <strong className="text-slate-900 dark:text-slate-100">{sig.signatoryName}</strong> ({sig.signatoryTitle || 'Representative'})
                            </p>
                            <p className="text-[11px] text-slate-400">Signed on: {sig.timestampFormatted || sig.signedAt}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {sig.signatureDataUrl && (
                              <img
                                src={sig.signatureDataUrl}
                                alt="Signature"
                                className="h-8 px-2 py-0.5 bg-slate-900 rounded border border-slate-700 object-contain"
                              />
                            )}
                            <button
                              onClick={() => setPreviewAgreement({ id: ag.id, title: ag.name, sigRecord: sig })}
                              className="px-2.5 py-1 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 rounded-lg border border-indigo-500/20 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="View Full Signed Contract"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Contract
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No digital signature recorded yet.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Uploaded Verification Documents */}
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-500" /> Uploaded KYC & Identity Files
                </h4>
              </div>

              <div className="space-y-4">
                {[
                  { id: 'incorporationCertificate', name: 'Certificate of Incorporation' },
                  { id: 'taxDocument', name: 'Tax ID / W-9 / VAT / GST Form' },
                  { id: 'signatoryId', name: 'Authorized Signatory Photo ID' },
                ].map((docItem) => {
                  const file = onboarding?.documents?.[docItem.id]
                  return (
                    <div
                      key={docItem.id}
                      className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">{docItem.name}</p>
                        {file ? (
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            {file.fileName} • {file.fileSize || 'Uploaded'}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 italic mt-0.5">File not uploaded yet</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {file ? (
                          <>
                            <button
                              onClick={() =>
                                setPreviewDoc({
                                  title: docItem.name,
                                  fileName: file.fileName,
                                  fileUrl: file.fileUrl,
                                  fileSize: file.fileSize,
                                  uploadedAt: file.timestampFormatted || file.uploadedAt,
                                })
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600/20 text-xs font-semibold flex items-center gap-1 transition-colors border border-indigo-500/20"
                              title="Preview Document"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview
                            </button>

                            {file.fileUrl && (
                              <button
                                type="button"
                                onClick={() => handleDownloadFile(docItem.id, file.fileUrl, file.fileName)}
                                disabled={downloadingDocId === docItem.id}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
                                title="Download Original File"
                              >
                                {downloadingDocId === docItem.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                                <span>{downloadingDocId === docItem.id ? 'Downloading...' : 'Download'}</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <Badge variant="neutral" className="text-[10px]">Missing</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Billing Info Summary */}
              {onboarding?.billingInfo && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <h5 className="font-bold uppercase tracking-wider text-slate-400">Billing Profile</h5>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500">Billing Email:</span>{' '}
                      <span className="font-medium">{onboarding.billingInfo.billingEmail}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Tax ID:</span>{' '}
                      <span className="font-medium">{onboarding.billingInfo.taxId || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Payment Method:</span>{' '}
                      <span className="font-medium uppercase">{onboarding.billingInfo.paymentMethod}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Contact Phone:</span>{' '}
                      <span className="font-medium">{onboarding.billingInfo.signerPhone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE & ACCOUNT DETAILS */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800 text-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold text-3xl flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30 mx-auto">
                {client?.displayName?.charAt(0) || client?.companyName?.charAt(0) || 'C'}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{client?.displayName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 mt-1">
                  <Building className="w-3.5 h-3.5" /> {client?.companyName}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                <Badge variant={status === 'active' ? 'success' : 'danger'}>
                  {status === 'active' ? 'Active Portal Access' : 'Access Suspended'}
                </Badge>
              </div>

              <div className="space-y-3 pt-4 text-left text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{client?.email}</span>
                </div>
                {client?.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{client?.phoneNumber}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>Created: {new Date(client?.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Security & Credentials</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Trigger a password reset email for this client representative.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleSendResetEmail}
                disabled={saving}
                className="w-full text-xs text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
                icon={Lock}
              >
                Send Password Reset Email
              </Button>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Account Details & Configurations</h3>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Client Contact Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    icon={User}
                    required
                  />
                  <Input
                    label="Company Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    icon={Building}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    icon={Phone}
                  />
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Account Access State</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#11141E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                    >
                      <option value="active">Active Access Granted</option>
                      <option value="suspended">Suspended / Deactivated</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Internal CRM Account Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes about the client..."
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-[#11141E] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="bg-indigo-600 hover:bg-indigo-500 px-6"
                    icon={Save}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Associated Projects
                  </h4>
                  <Badge variant="neutral">{projects.length}</Badge>
                </div>

                {projects.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No active projects linked to this client.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {projects.map((p) => (
                      <div key={p.projectId} className="p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{p.name}</span>
                        <Badge variant="brand">{p.completionPercent || 0}%</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5 border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Billing & Invoices
                  </h4>
                  <Badge variant="neutral">{invoices.length}</Badge>
                </div>

                {invoices.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No billing details or invoices found.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {invoices.map((i) => (
                      <div key={i.invoiceId} className="p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-850 rounded-lg flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-850 font-mono">{i.invoiceNumber || 'INV-001'}</span>
                        <span className="font-bold">${(i.total || 0).toLocaleString()}</span>
                        <Badge variant={i.status === 'paid' ? 'success' : 'warning'}>{i.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW & DOWNLOAD MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{previewDoc.title}</h3>
                  <p className="text-[11px] text-slate-400">{previewDoc.fileName} • {previewDoc.fileSize}</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Viewer Container */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[300px] max-h-[500px] overflow-auto">
              {previewDoc.fileUrl && (previewDoc.fileUrl.startsWith('data:image') || previewDoc.fileUrl.startsWith('blob:') || previewDoc.fileUrl.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i) || previewDoc.fileName?.match(/\.(png|jpg|jpeg|webp|gif|svg)$/i)) ? (
                <div className="w-full flex flex-col items-center justify-center gap-3">
                  <img
                    src={previewDoc.fileUrl}
                    alt={previewDoc.fileName}
                    className="max-h-96 w-auto max-w-full rounded-xl object-contain border border-slate-800 shadow-lg bg-slate-900/50"
                  />
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>High-resolution KYC verification image</span>
                  </div>
                </div>
              ) : previewDoc.fileUrl && (previewDoc.fileUrl.startsWith('data:application/pdf') || previewDoc.fileUrl.match(/\.pdf$/i) || previewDoc.fileName?.match(/\.pdf$/i)) ? (
                <div className="w-full h-[420px] rounded-xl overflow-hidden border border-slate-800">
                  <iframe
                    src={previewDoc.fileUrl}
                    title={previewDoc.fileName}
                    className="w-full h-full border-0 bg-slate-900"
                  />
                </div>
              ) : (
                <div className="text-center space-y-4 py-8 max-w-md mx-auto">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-inner">
                    <FileText className="w-10 h-10" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">{previewDoc.fileName}</h4>
                    <p className="text-xs text-slate-400 mt-1">Uploaded: {previewDoc.uploadedAt}</p>
                    <p className="text-xs text-slate-400">File Size: {previewDoc.fileSize}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Compliance Document Verified
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setPreviewDoc(null)}>
                Close
              </Button>
              {previewDoc.fileUrl && (
                <button
                  type="button"
                  onClick={() => handleDownloadFile('modal_preview', previewDoc.fileUrl, previewDoc.fileName)}
                  disabled={downloadingDocId === 'modal_preview'}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {downloadingDocId === 'modal_preview' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{downloadingDocId === 'modal_preview' ? 'Downloading...' : 'Download Document'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIGNED CONTRACT & LEGAL CERTIFICATE MODAL */}
      {previewAgreement && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{previewAgreement.title}</h3>
                  <p className="text-[11px] text-emerald-400 font-medium">Legally Executed E-Signature Certificate</p>
                </div>
              </div>
              <button
                onClick={() => setPreviewAgreement(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Agreement Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                {AGREEMENT_TEMPLATES[previewAgreement.id]?.content || 'Agreement text content...'}
              </div>

              {/* Execution Certificate Stamp */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <CheckCircle className="w-4 h-4" /> Digital E-Signature Validated
                  </div>
                  <p className="text-slate-300">
                    Signatory: <strong className="text-slate-100">{previewAgreement.sigRecord?.signatoryName}</strong> ({previewAgreement.sigRecord?.signatoryTitle || 'Representative'})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Execution Timestamp: {previewAgreement.sigRecord?.timestampFormatted || previewAgreement.sigRecord?.signedAt}
                  </p>
                </div>

                {previewAgreement.sigRecord?.signatureDataUrl && (
                  <div className="text-center space-y-1">
                    <img
                      src={previewAgreement.sigRecord.signatureDataUrl}
                      alt="Signature Seal"
                      className="h-12 px-3 py-1 bg-slate-900 rounded-lg border border-slate-700 object-contain mx-auto"
                    />
                    <span className="text-[10px] text-slate-500">Signatory Seal</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800 shrink-0">
              <Button variant="secondary" size="sm" onClick={() => setPreviewAgreement(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="bg-indigo-600 hover:bg-indigo-500"
                icon={Printer}
              >
                Print / Save PDF Certificate
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RE-SUBMISSION FEEDBACK MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-slate-100 text-base">Request Document Re-submission</h3>
            </div>
            <p className="text-xs text-slate-400">
              Specify what needs correction or re-upload (e.g. illegible tax form, missing authorized signatory ID). The client will see this feedback when logging in.
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Please re-upload a clear high-resolution copy of your Certificate of Incorporation and Authorized Signatory ID."
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-xl p-3 focus:outline-none focus:border-rose-500 resize-none"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRejectModal(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleRejectClient}
                disabled={saving || !rejectReason.trim()}
                icon={XCircle}
              >
                {saving ? 'Submitting...' : 'Send Request to Client'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
