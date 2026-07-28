import React, { useState, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { Input } from '../../shared/components/ui/Input'
import { useCRMStore } from './stores/crmStore'
import { getClientsFromDb } from './services/clientService'
import { createClientAccount } from '../../shared/services/authService'
import {
  Kanban,
  List,
  Contact,
  UserPlus,
  Mail,
  Phone,
  Building,
  X,
  Plus,
  ExternalLink,
  Shield,
  Search,
  Eye,
  EyeOff
} from 'lucide-react'

export const ContactList = () => {
  const { leads, addLead } = useCRMStore()
  const [activeTab, setActiveTab] = useState('clients') // 'clients' or 'leads'
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [clientAccounts, setClientAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form State for Add Client Contact
  const [clientName, setClientName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [dealName, setDealName] = useState('')

  const fetchClients = async () => {
    const data = await getClientsFromDb()
    setClientAccounts(data)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Extract contacts from leads store
  const leadContacts = leads.map((l) => ({
    id: l.leadId,
    name: l.contactName,
    company: l.companyName,
    email: l.email || `${l.contactName?.toLowerCase().replace(/\s+/g, '.')}@${l.companyName?.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: l.phone || '',
    dealName: l.name,
  }))

  const handleCreateClient = async (e) => {
    e.preventDefault()
    if (!clientName.trim() || !companyName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 1. Create Firebase Auth user & Firestore document in /users/{uid}
      const clientUser = await createClientAccount(email, password, clientName, companyName, phone)

      // 2. Add lead to local Zustand CRM store so it updates pipeline too
      addLead({
        name: dealName || `${companyName} Account`,
        companyName,
        contactName: clientName,
        email,
        phone: phone || '+1 (555) 019-2834',
        estimatedValue: 25000,
        pipelineStageId: 'stage_won',
        pipelineStage: 'Won',
        ownerName: 'Admin Executive',
        clientId: clientUser.uid
      })

      setSuccess(`Client account created successfully for ${email}!`)
      
      // Reset Form fields
      setClientName('')
      setCompanyName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setDealName('')
      
      // Refresh list and close modal
      await fetchClients()
      setTimeout(() => {
        setShowAddModal(false)
        setSuccess('')
      }, 1500)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to create client account.')
    } finally {
      setLoading(false)
    }
  }

  // Filters
  const filteredClients = clientAccounts.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      c.displayName?.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  const filteredLeadContacts = leadContacts.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header & Sub-Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Contacts & Client Directory"
          description="Directory of individual client contacts, portal accounts, and key decision makers"
          actions={
            <Button icon={UserPlus} variant="primary" onClick={() => setShowAddModal(true)}>
              Register Client Portal User
            </Button>
          }
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <NavLink
              to="/crm/pipeline"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Kanban className="w-3.5 h-3.5" /> Pipeline Board
            </NavLink>
            <NavLink
              to="/crm/leads"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <List className="w-3.5 h-3.5" /> All Leads Directory
            </NavLink>
            <NavLink
              to="/crm/contacts"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Contact className="w-3.5 h-3.5" /> Contacts Directory
            </NavLink>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search directory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-2.5 text-xs font-bold transition-all relative border-b-2 ${
            activeTab === 'clients'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Client Portal Users ({filteredClients.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-2.5 text-xs font-bold transition-all relative border-b-2 ${
            activeTab === 'leads'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Sales Leads Contacts ({filteredLeadContacts.length})
        </button>
      </div>

      {/* Grid of Cards */}
      {activeTab === 'clients' ? (
        filteredClients.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No registered client portal accounts found. Click "Register Client Portal User" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((c) => (
              <Card key={c.uid} hover className="space-y-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center border border-emerald-200 dark:border-emerald-500/30">
                        {c.displayName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.displayName}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {c.companyName}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{c.email}</span>
                    </div>
                    {c.phoneNumber && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{c.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-2 mt-2">
                  <Badge variant="success">Active Account</Badge>
                  <Link
                    to={`/crm/client/${c.uid}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    Manage Profile <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        filteredLeadContacts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No sales leads contacts found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLeadContacts.map((c) => (
              <Card key={c.id} hover className="space-y-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30">
                    {c.name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{c.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {c.company}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    <span>{c.phone}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Linked Opportunity:</span>
                  <Badge variant="neutral">{c.dealName}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Add Client Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Register Client Portal User</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 text-xs bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-xs bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20">
                {success}
              </div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-4">
              <Input
                label="Client Representative Name *"
                placeholder="e.g. Jane Smith"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />

              <Input
                label="Company / Account Name *"
                placeholder="e.g. Acme Corporation"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Client Login Email *"
                  type="email"
                  placeholder="jane@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Password field */}
              <div className="relative">
                <Input
                  label="Set Account Password *"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[32px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <Input
                label="Primary Deal Contract Title"
                placeholder="e.g. Enterprise Platform Portal Retainer"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3" disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3 bg-indigo-600 hover:bg-indigo-500" icon={Plus} disabled={loading}>
                  {loading ? 'Registering Account...' : 'Create Client Account'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
