import React from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { useCRMStore } from './stores/crmStore'
import {
  Kanban,
  List,
  Contact,
  UserPlus,
  Mail,
  Phone,
  Building
} from 'lucide-react'

export const ContactList = () => {
  const { leads } = useCRMStore()

  // Extract unique contacts from leads store
  const contacts = leads.map((l) => ({
    id: l.leadId,
    name: l.contactName,
    company: l.companyName,
    email: l.email || `${l.contactName?.toLowerCase().replace(/\s+/g, '.')}@${l.companyName?.toLowerCase().replace(/\s+/g, '')}.com`,
    phone: l.phone || '+1 (555) 019-2834',
    dealName: l.name,
  }))

  return (
    <div className="space-y-6">
      {/* Header & Sub-Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Contacts Directory"
          description="Directory of individual client contacts, decision makers, and accounts"
          actions={<Button icon={UserPlus}>Add Contact</Button>}
        />

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <NavLink
            to="/crm/pipeline"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
          <Card key={c.id} hover className="space-y-3 border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30">
                {c.name?.charAt(0) || 'C'}
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">{c.name}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <Building className="w-3 h-3 text-slate-500" /> {c.company}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">{c.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{c.phone}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500">
              <span>Linked Deal:</span>
              <Badge variant="neutral">{c.dealName}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
