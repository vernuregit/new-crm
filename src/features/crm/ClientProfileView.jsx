import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { Spinner } from '../../shared/components/ui/Spinner'
import { getUserDoc } from '../../shared/services/authService'
import { updateClientInDb } from './services/clientService'
import { db, auth } from '../../shared/services/firebaseService'
import { sendPasswordResetEmail } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  Lock,
  User,
  ShieldAlert,
  Save,
  CheckCircle,
  FileText,
  Briefcase,
  AlertCircle
} from 'lucide-react'

export const ClientProfileView = () => {
  const { clientId } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [projects, setProjects] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  // Edit fields
  const [displayName, setDisplayName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [status, setStatus] = useState('active')
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      setSuccess('Client account updated successfully!')
      setClient((prev) => ({
        ...prev,
        displayName,
        companyName,
        phoneNumber,
        status,
        notes,
      }))
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
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner className="w-8 h-8 text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header with Back button */}
      <div className="flex items-center gap-3">
        <Link
          to="/crm/contacts"
          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <PageHeader
          title={`Manage Client: ${client?.displayName || 'Client User'}`}
          description={`Registered Client Workspace profile for ${client?.companyName || 'Corporate Client'}`}
        />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Overview Info and Auth Settings */}
        <div className="lg:col-span-1 space-y-6">
          {/* Main Info Card */}
          <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800 text-center">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold text-3xl flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30 mx-auto">
              {client?.displayName?.charAt(0) || 'C'}
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
                <span>Created: {new Date(client?.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>

          {/* Account Security Card */}
          <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Security & Credentials</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Trigger an email verification or link to allow this client representative to securely reset their credentials.
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

        {/* Right column: Edit Profile & Internal Notes & Linked Assets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Form */}
          <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Account Details & Configurations</h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Client Name"
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

              {/* Internal notes */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Internal CRM Account Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about the client (preferred contact methods, contract details, invoicing rules...)"
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

          {/* Linked projects & invoices */}
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
                      <span className="font-semibold text-slate-850 dark:text-slate-250 font-mono">{i.invoiceNumber || 'INV-001'}</span>
                      <span className="font-bold text-slate-950 dark:text-slate-50">${(i.total || 0).toLocaleString()}</span>
                      <Badge variant={i.status === 'paid' ? 'success' : 'warning'}>{i.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
