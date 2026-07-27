import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useCRMStore } from './stores/crmStore'
import {
  Kanban,
  List,
  Contact,
  UserPlus,
  Mail,
  Phone,
  Building,
  X,
  Plus
} from 'lucide-react'

export const ContactList = () => {
  const { leads, addLead } = useCRMStore()
  const [showAddModal, setShowAddModal] = useState(false)

  // Form State for Add Client Contact
  const [clientName, setClientName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dealName, setDealName] = useState('')

  // Extract contacts from leads store
  const contacts = leads.map((l) => ({
    id: l.leadId,
    name: l.contactName,
    company: l.companyName,
    email: l.email || `${l.contactName?.toLowerCase().replace(/\s+/g, '.')}@${l.companyName?.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: l.phone || '+1 (555) 019-2834',
    dealName: l.name,
  }))

  const handleCreateClient = (e) => {
    e.preventDefault()
    if (!clientName.trim() || !companyName.trim()) return

    addLead({
      name: dealName || `${companyName} Account`,
      companyName,
      contactName: clientName,
      email: email || `${clientName.toLowerCase().replace(/\s+/g, '.')}@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
      phone: phone || '+1 (555) 019-2834',
      estimatedValue: 25000,
      pipelineStageId: 'stage_won',
      pipelineStage: 'Won',
      ownerName: 'Admin Executive',
    })

    setClientName('')
    setCompanyName('')
    setEmail('')
    setPhone('')
    setDealName('')
    setShowAddModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub-Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Contacts & Client Directory"
          description="Directory of individual client contacts, decision makers, and tenant accounts"
          actions={
            <Button icon={UserPlus} variant="primary" onClick={() => setShowAddModal(true)}>
              Add Client Account
            </Button>
          }
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
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
      </div>

      {/* Grid of Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map((c) => (
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
              <span>Linked Account / Deal:</span>
              <Badge variant="neutral">{c.dealName}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Client Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Create New Client Account</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4">
              <Input
                label="Client Representative Name"
                placeholder="e.g. Jane Smith"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />

              <Input
                label="Company / Account Name"
                placeholder="e.g. Acme Corporation"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Client Work Email"
                  type="email"
                  placeholder="jane@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  label="Phone Number"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <Input
                label="Primary Project / Account Contract Title"
                placeholder="e.g. Enterprise Platform Portal Retainer"
                value={dealName}
                onChange={(e) => setDealName(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Create Client Account
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
