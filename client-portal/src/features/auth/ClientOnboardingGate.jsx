import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  FileCheck2,
  UploadCloud,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Building,
  Check,
  FileText,
  Lock,
  Sun,
  Moon,
} from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Spinner } from '../../components/ui/Spinner'
import { SignaturePad } from '../../components/ui/SignaturePad'
import { DocumentUploadDropzone } from '../../components/ui/DocumentUploadDropzone'
import { useUserStore } from '../../stores/userStore'
import { useUIStore } from '../../stores/uiStore'
import haloLogo from '../../assets/halologo.png'
import {
  DEFAULT_AGREEMENTS,
  REQUIRED_DOCUMENT_TYPES,
  getClientOnboardingDoc,
  submitClientOnboarding,
} from '../../shared/services/onboardingService'
import { logoutUser } from '../../shared/services/authService'

export const ClientOnboardingGate = () => {
  const navigate = useNavigate()
  const { user, userDoc, setUser, clearUser } = useUserStore()
  const { theme, toggleTheme } = useUIStore()

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1) // 1: Signatures, 2: Documents, 3: Billing, 4: Review
  const [agreementIndex, setAgreementIndex] = useState(0) // 0: MSA, 1: NDA, 2: SOW
  const [kycIndex, setKycIndex] = useState(0) // 0: Incorporation, 1: Tax, 2: Signatory ID

  // Onboarding Status State
  const [onboardingData, setOnboardingData] = useState(null)
  const [onboardingStatus, setOnboardingStatus] = useState('pending_documents')
  const [rejectionReason, setRejectionReason] = useState('')

  // Form Data
  const [companyName, setCompanyName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [taxId, setTaxId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('ach')
  const [signerPhone, setSignerPhone] = useState('')

  // Agreements State: { msa: { signed: true, ... }, nda: ... }
  const [agreements, setAgreements] = useState({})

  // Documents State: { incorporationCertificate: { fileName: ... }, taxDocument: ... }
  const [documents, setDocuments] = useState({})

  const [errorMsg, setErrorMsg] = useState('')

  // Load existing onboarding status
  const loadStatus = async () => {
    if (!user?.uid) {
      navigate('/login')
      return
    }

    try {
      const data = await getClientOnboardingDoc(user.uid)
      if (data) {
        setOnboardingData(data)
        const status = data.onboardingStatus || 'pending_documents'
        setOnboardingStatus(status)
        setRejectionReason(data.rejectionReason || '')
        setCompanyName(data.companyName || userDoc?.companyName || '')
        setAgreements(data.agreements || {})
        setDocuments(data.documents || {})

        if (data.billingInfo) {
          setBillingEmail(data.billingInfo.billingEmail || user.email || '')
          setBillingAddress(data.billingInfo.billingAddress || '')
          setTaxId(data.billingInfo.taxId || '')
          setPaymentMethod(data.billingInfo.paymentMethod || 'ach')
          setSignerPhone(data.billingInfo.signerPhone || '')
        } else {
          setBillingEmail(user.email || '')
        }

        // If approved, update store and localStorage before navigating to prevent AppShell bounce
        if (status === 'approved') {
          try {
            localStorage.setItem(`onboarding_status_${user.uid}`, 'approved')
          } catch {
            // ignore
          }
          setUser(user, { ...userDoc, onboardingStatus: 'approved', ...data })
          navigate('/portal', { replace: true })
        }
      }
    } catch (err) {
      console.error('Error loading onboarding status:', err)
    }
  }

  useEffect(() => {
    if (user?.uid) {
      loadStatus()
    }
  }, [user?.uid])

  const handleAgreementSave = (agreementId, sigRecord) => {
    setAgreements((prev) => {
      if (!sigRecord) {
        const copy = { ...prev }
        delete copy[agreementId]
        return copy
      }
      return { ...prev, [agreementId]: sigRecord }
    })
  }

  const handleDocumentSelect = (docId, fileRecord) => {
    setDocuments((prev) => ({ ...prev, [docId]: fileRecord }))
  }

  const handleDocumentRemove = (docId) => {
    setDocuments((prev) => {
      const copy = { ...prev }
      delete copy[docId]
      return copy
    })
  }

  // Validate step completion
  const areSignaturesComplete = () => {
    return DEFAULT_AGREEMENTS.every((ag) => agreements[ag.id]?.signed)
  }

  const areDocumentsComplete = () => {
    return REQUIRED_DOCUMENT_TYPES.every((doc) => !!documents[doc.id])
  }

  const isBillingComplete = () => {
    return companyName.trim() && billingEmail.trim() && billingAddress.trim()
  }

  const handleSubmitOnboarding = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    if (!areSignaturesComplete()) {
      setErrorMsg('All legal agreements must be electronically signed.')
      setStep(1)
      return
    }

    if (!areDocumentsComplete()) {
      setErrorMsg('All required compliance documents must be uploaded.')
      setStep(2)
      return
    }

    if (!isBillingComplete()) {
      setErrorMsg('Please fill in all mandatory company and billing fields.')
      setStep(3)
      return
    }

    try {
      setSubmitting(true)
      const payload = {
        companyName: companyName.trim(),
        agreements,
        documents,
        billingInfo: {
          billingEmail: billingEmail.trim(),
          billingAddress: billingAddress.trim(),
          taxId: taxId.trim(),
          paymentMethod,
          signerPhone: signerPhone.trim(),
        },
      }

      const result = await submitClientOnboarding(user.uid, payload)
      setOnboardingData(result)
      setOnboardingStatus('pending_approval')
      setUser(user, { ...userDoc, onboardingStatus: 'pending_approval', companyName })
    } catch (err) {
      console.error('Submission failed:', err)
      setErrorMsg(err.message || 'Failed to submit onboarding package. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    await logoutUser()
    clearUser()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0D14] flex flex-col items-center justify-center p-4 text-slate-900 dark:text-slate-100 transition-colors">
        <Spinner size="lg" />
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">Verifying client workspace authorization...</p>
      </div>
    )
  }

  // ─── RENDER: PENDING APPROVAL SCREEN (UNDER ADMIN REVIEW) ───────────────────────
  if (onboardingStatus === 'pending_approval') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A0D14] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 relative overflow-hidden transition-colors">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/10 dark:bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />

        <Card className="w-full max-w-2xl p-8 relative z-10 border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                <img src={haloLogo} alt="Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Client Compliance Verification</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Account: {user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-400 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>
              <Badge variant="warning" className="flex items-center gap-1.5 px-3 py-1 text-xs">
                <Clock className="w-3.5 h-3.5 animate-spin" /> Under Admin Review
              </Badge>
            </div>
          </div>

          <div className="text-center py-4 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Documents & Signatures Under Review</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
              Thank you for submitting your legal agreements and verification documents. Our operations and compliance team has been notified and is currently verifying your submission.
            </p>
          </div>

          {/* Audit Verification Checklist */}
          <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Submission Package Details</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-sm dark:shadow-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Legal Agreements (3/3)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">MSA, NDA & SOW Digitally Signed</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-sm dark:shadow-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">KYC Documents (3/3)</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Certificate, Tax ID & Signatory ID</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-sm dark:shadow-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Billing Setup</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Authorized for {companyName || 'Entity'}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-sm dark:shadow-none">
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Admin Approval</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Pending Executive Sign-off</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              Deliverables, invoices, code repositories, and project timelines will automatically unlock on this portal as soon as an administrator grants approval.
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button variant="secondary" size="sm" onClick={handleLogout} icon={LogOut}>
              Sign Out
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={loadStatus}
              className="bg-indigo-600 hover:bg-indigo-500"
              icon={RefreshCw}
            >
              Check Approval Status
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ─── RENDER: MULTI-STEP ONBOARDING WIZARD ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0D14] text-slate-900 dark:text-slate-100 flex flex-col p-4 sm:p-8 relative overflow-hidden transition-colors">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/10 dark:bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
            <img src={haloLogo} alt="Logo" className="w-full h-full object-contain rounded-full" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Client Onboarding & Compliance Gate</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Complete required documents and signatures to activate your portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sun/Moon Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-amber-400 flex items-center justify-center transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300 -rotate-12 hover:rotate-0" />
            )}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="max-w-4xl w-full mx-auto mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          {[
            { num: 1, title: 'Legal Signatures', icon: FileCheck2 },
            { num: 2, title: 'KYC Documents', icon: UploadCloud },
            { num: 3, title: 'Billing Setup', icon: CreditCard },
            { num: 4, title: 'Review & Submit', icon: CheckCircle2 },
          ].map((s) => {
            const Icon = s.icon
            const isDone =
              (s.num === 1 && areSignaturesComplete()) ||
              (s.num === 2 && areDocumentsComplete()) ||
              (s.num === 3 && isBillingComplete())
            const isCurrent = step === s.num

            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setStep(s.num)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-indigo-50 dark:bg-indigo-600/15 border-indigo-500 dark:border-indigo-500/60 shadow-md shadow-indigo-500/10'
                    : isDone
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-slate-300'
                    : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.num}
                  </div>
                  <Icon
                    className={`w-4 h-4 ${
                      isDone ? 'text-emerald-500 dark:text-emerald-400' : isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'
                    }`}
                  />
                </div>
                <p className="text-xs font-semibold truncate text-slate-900 dark:text-slate-200">{s.title}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Form Container */}
      <div className="max-w-4xl w-full mx-auto pb-16">
        {/* Rejection / Resubmission Banner if applicable */}
        {onboardingStatus === 'rejected' && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-800 dark:text-rose-200">Re-submission Requested by Compliance Admin</p>
              <p className="mt-1 text-slate-700 dark:text-slate-300">
                {rejectionReason || 'Please review your uploaded documents or signatures and re-submit for approval.'}
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: LEGAL AGREEMENTS & E-SIGNATURES (INDIVIDUAL CONTRACT SUB-PAGES) */}
        {step === 1 && (() => {
          const currentAgreement = DEFAULT_AGREEMENTS[agreementIndex] || DEFAULT_AGREEMENTS[0]
          const isCurrentAgreementSigned = !!agreements[currentAgreement.id]?.signed
          const signedAgreementsCount = DEFAULT_AGREEMENTS.filter((ag) => agreements[ag.id]?.signed).length

          return (
            <div className="space-y-6">
              {/* Header & Sub-step Progress Banner */}
              <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Step 1: Execute Legal & Services Agreements</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Review and electronically execute each agreement individually. Full contract terms are displayed below.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                      Progress: {signedAgreementsCount} of {DEFAULT_AGREEMENTS.length} Signed
                    </span>
                  </div>
                </div>

                {/* Agreement Contract Sub-Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {DEFAULT_AGREEMENTS.map((ag, idx) => {
                    const isSigned = !!agreements[ag.id]?.signed
                    const isSelected = agreementIndex === idx

                    return (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => {
                          setErrorMsg('')
                          setAgreementIndex(idx)
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-sm'
                            : isSigned
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                            : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isSigned
                                ? 'bg-emerald-500 text-white'
                                : isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isSigned ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate text-slate-900 dark:text-slate-200">
                              {ag.id.toUpperCase()} Agreement
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {idx === 0 ? 'Master Services' : idx === 1 ? 'Non-Disclosure' : 'Statement of Work'}
                            </p>
                          </div>
                        </div>

                        {isSigned ? (
                          <Badge variant="success" className="text-[10px] shrink-0">Signed</Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] shrink-0">Pending</Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dedicated Agreement Viewer & Signature Card */}
              <SignaturePad
                key={currentAgreement.id}
                agreementTitle={currentAgreement.title}
                agreementSummary={currentAgreement.summary}
                agreementContent={currentAgreement.content}
                initialData={agreements[currentAgreement.id]}
                onSave={(record) => {
                  handleAgreementSave(currentAgreement.id, record)
                  setErrorMsg('')
                }}
                showFullAgreementByDefault={true}
                allowToggle={true}
              />

              {/* Bottom Sub-step Navigation Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div>
                  {agreementIndex > 0 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setErrorMsg('')
                        setAgreementIndex((prev) => prev - 1)
                      }}
                      icon={ArrowLeft}
                    >
                      Back to {DEFAULT_AGREEMENTS[agreementIndex - 1]?.title.split('(')[0]}
                    </Button>
                  ) : (
                    <div />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {agreementIndex < DEFAULT_AGREEMENTS.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!isCurrentAgreementSigned) {
                          setErrorMsg(`Please sign and accept the ${currentAgreement.title.split('(')[0]} before moving to the next document.`)
                          return
                        }
                        setErrorMsg('')
                        setAgreementIndex((prev) => prev + 1)
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500"
                      icon={ArrowRight}
                    >
                      Next: Review {DEFAULT_AGREEMENTS[agreementIndex + 1]?.title.split('(')[0]}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!areSignaturesComplete()) {
                          setErrorMsg('Please ensure all 3 mandatory agreements are signed before proceeding.')
                          return
                        }
                        setErrorMsg('')
                        setStep(2)
                      }}
                      disabled={!areSignaturesComplete()}
                      className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                      icon={ArrowRight}
                    >
                      Proceed to Step 2: KYC Document Uploads
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* STEP 2: KYC & COMPLIANCE DOCUMENTS (INDIVIDUAL DOCUMENT SUB-PAGES) */}
        {step === 2 && (() => {
          const currentDoc = REQUIRED_DOCUMENT_TYPES[kycIndex] || REQUIRED_DOCUMENT_TYPES[0]
          const isCurrentDocUploaded = !!documents[currentDoc.id]
          const uploadedDocsCount = REQUIRED_DOCUMENT_TYPES.filter((doc) => !!documents[doc.id]).length

          return (
            <div className="space-y-6">
              {/* Header & Sub-step Progress Banner */}
              <div className="bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Step 2: Upload Compliance & Identity Verification Documents</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload clear PDF copies or high-resolution images for each mandatory compliance document individually.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      Progress: {uploadedDocsCount} of {REQUIRED_DOCUMENT_TYPES.length} Uploaded
                    </span>
                  </div>
                </div>

                {/* KYC Document Sub-Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {REQUIRED_DOCUMENT_TYPES.map((doc, idx) => {
                    const isUploaded = !!documents[doc.id]
                    const isSelected = kycIndex === idx

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setErrorMsg('')
                          setKycIndex(idx)
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 text-indigo-950 dark:text-indigo-200 shadow-sm'
                            : isUploaded
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                            : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                              isUploaded
                                ? 'bg-emerald-500 text-white'
                                : isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {isUploaded ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate text-slate-900 dark:text-slate-200">
                              {idx === 0 ? 'Business License' : idx === 1 ? 'Tax Document' : 'Signatory ID'}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {doc.name}
                            </p>
                          </div>
                        </div>

                        {isUploaded ? (
                          <Badge variant="success" className="text-[10px] shrink-0">Uploaded</Badge>
                        ) : (
                          <Badge variant="neutral" className="text-[10px] shrink-0">Pending</Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Dedicated Document Dropzone Card */}
              <DocumentUploadDropzone
                key={currentDoc.id}
                docId={currentDoc.id}
                title={currentDoc.name}
                description={currentDoc.description}
                acceptedFormats={currentDoc.acceptedFormats}
                initialDoc={documents[currentDoc.id]}
                onFileSelect={(id, fileData) => {
                  handleDocumentSelect(id, fileData)
                  setErrorMsg('')
                }}
                onFileRemove={handleDocumentRemove}
              />

              {/* Bottom Sub-step Navigation Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div>
                  {kycIndex > 0 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setErrorMsg('')
                        setKycIndex((prev) => prev - 1)
                      }}
                      icon={ArrowLeft}
                    >
                      Back to {REQUIRED_DOCUMENT_TYPES[kycIndex - 1]?.name.split('/')[0]}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setErrorMsg('')
                        setStep(1)
                      }}
                      icon={ArrowLeft}
                    >
                      Back to Legal Agreements
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {kycIndex < REQUIRED_DOCUMENT_TYPES.length - 1 ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!isCurrentDocUploaded) {
                          setErrorMsg(`Please upload the ${currentDoc.name.split('/')[0]} before continuing.`)
                          return
                        }
                        setErrorMsg('')
                        setKycIndex((prev) => prev + 1)
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500"
                      icon={ArrowRight}
                    >
                      Next: Upload {REQUIRED_DOCUMENT_TYPES[kycIndex + 1]?.name.split('/')[0]}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        if (!areDocumentsComplete()) {
                          setErrorMsg('Please upload all 3 mandatory compliance documents before continuing.')
                          return
                        }
                        setErrorMsg('')
                        setStep(3)
                      }}
                      disabled={!areDocumentsComplete()}
                      className="bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20"
                      icon={ArrowRight}
                    >
                      Complete Documents & Proceed to Billing Setup
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* STEP 3: BILLING & ENTITY PROFILE */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Step 3: Company Profile & Billing Authorization</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Provide the registered legal entity details and accounts payable contact for official invoicing.
              </p>
            </div>

            <Card className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Registered Company / Entity Name"
                  placeholder="e.g. Acme Innovations Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  icon={Building}
                  required
                />
                <Input
                  label="Accounts Payable / Billing Email"
                  type="email"
                  placeholder="billing@company.com"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Registered Business Physical Address</label>
                <textarea
                  rows={3}
                  placeholder="Suite 400, 100 Innovation Way, San Francisco, CA 94107"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Tax ID / EIN / VAT / GST Registration Number"
                  placeholder="e.g. XX-XXXXXXX"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
                <Input
                  label="Authorized Contact Phone"
                  placeholder="+1 (555) 019-2834"
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1.5 text-left pt-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Preferred Payment Settlement Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
                >
                  <option value="ach">ACH Electronic Direct Bank Transfer (US & Global)</option>
                  <option value="card">Corporate Credit / Debit Card (Stripe Portal)</option>
                  <option value="wire">International Wire Transfer (SWIFT / IBAN)</option>
                </select>
              </div>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(2)} icon={ArrowLeft}>
                Back to Documents
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (!isBillingComplete()) {
                    setErrorMsg('Please complete company name, billing email, and address.')
                    return
                  }
                  setErrorMsg('')
                  setStep(4)
                }}
                disabled={!isBillingComplete()}
                className="bg-indigo-600 hover:bg-indigo-500"
                icon={ArrowRight}
              >
                Proceed to Review & Submit
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Step 4: Final Compliance Review & Package Submission</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Please verify the summary below. Upon submission, our operations and admin team will review and approve your workspace access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Signed Contracts Summary */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Executed Contracts</h3>
                </div>

                <div className="space-y-2">
                  {DEFAULT_AGREEMENTS.map((ag) => {
                    const sig = agreements[ag.id]
                    return (
                      <div key={ag.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{ag.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">Signatory: {sig?.signatoryName || 'Pending'}</p>
                        </div>
                        {sig?.signed ? (
                          <Badge variant="success" className="text-[10px]">Signed</Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">Missing</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Uploaded Documents Summary */}
              <Card className="p-5 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Uploaded Verification Files</h3>
                </div>

                <div className="space-y-2">
                  {REQUIRED_DOCUMENT_TYPES.map((doc) => {
                    const file = documents[doc.id]
                    return (
                      <div key={doc.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="truncate max-w-[200px]">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{doc.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{file?.fileName || 'Pending Upload'}</p>
                        </div>
                        {file ? (
                          <Badge variant="success" className="text-[10px]">Uploaded</Badge>
                        ) : (
                          <Badge variant="danger" className="text-[10px]">Missing</Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            {/* Entity Summary */}
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">Entity & Invoicing Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-500">Company Entity:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{companyName}</p>
                </div>
                <div>
                  <span className="text-slate-500">Billing Email:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{billingEmail}</p>
                </div>
                <div>
                  <span className="text-slate-500">Payment Channel:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{paymentMethod}</p>
                </div>
              </div>
            </Card>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span>
                By submitting this package, you confirm that all provided legal agreements and company identification files are accurate and authentic. Your workspace access will be activated upon compliance review by the administrator.
              </span>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="secondary" onClick={() => setStep(3)} icon={ArrowLeft}>
                Back to Billing
              </Button>

              <Button
                variant="primary"
                onClick={handleSubmitOnboarding}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                icon={Shield}
              >
                {submitting ? 'Submitting Package...' : 'Submit Package for Admin Approval'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
