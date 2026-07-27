import React from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { FileText, CreditCard, Clock, Plus, RefreshCw } from 'lucide-react'

export const RecurringBilling = () => {
  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Recurring Billing & Retainers"
          description="Automate periodic client retainers, subscription profiles, and scheduled invoice generation"
          actions={<Button icon={Plus}>Add Retainer Profile</Button>}
        />

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <NavLink
            to="/finance/invoices"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <FileText className="w-3.5 h-3.5" /> Invoices
          </NavLink>
          <NavLink
            to="/finance/expenses"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <CreditCard className="w-3.5 h-3.5" /> Expenses & Vendors
          </NavLink>
          <NavLink
            to="/finance/recurring"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Clock className="w-3.5 h-3.5" /> Recurring Billing
          </NavLink>
        </div>
      </div>

      {/* Retainers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { client: 'Acme Corp', profile: 'Monthly Retainer - Full Service', interval: 'Monthly (1st)', amount: '$10,000', status: 'Active' },
          { client: 'Nexus Tech', profile: 'Quarterly Infrastructure SLA', interval: 'Quarterly', amount: '$24,000', status: 'Active' },
        ].map((ret, i) => (
          <Card key={i} hover className="space-y-3 border-slate-800">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-100 text-sm">{ret.client}</h4>
              <Badge variant="success">{ret.status}</Badge>
            </div>
            <p className="text-xs text-indigo-400">{ret.profile}</p>
            <div className="flex justify-between items-center text-xs text-slate-300 pt-2 border-t border-slate-800">
              <span className="flex items-center gap-1 text-slate-400">
                <RefreshCw className="w-3 h-3 text-slate-500" /> {ret.interval}
              </span>
              <span className="font-bold text-emerald-400 text-sm">{ret.amount}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
