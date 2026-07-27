import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import { useFinanceStore } from '../finance/stores/financeStore'
import { usePortalStore } from './stores/portalStore'
import { getInvoices } from '../finance/services/financeService'
import { ProfessionalInvoiceModal } from '../finance/components/ProfessionalInvoiceModal'
import { downloadInvoiceAsPDF } from '../finance/utils/pdfGenerator'
import { Briefcase, FileText, Download, Layers, CreditCard, Eye, Loader2 } from 'lucide-react'

export const ClientInvoices = () => {
  const { invoices: adminInvoices, isLoading, setInvoices, setIsLoading, updateInvoiceStatus } = useFinanceStore()
  const { invoices: portalInvoices } = usePortalStore()
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  useEffect(() => {
    let isMounted = true
    const fetchRealInvoices = async () => {
      setIsLoading(true)
      const data = await getInvoices()
      if (isMounted) {
        setInvoices(data || [])
      }
    }
    fetchRealInvoices()
    return () => {
      isMounted = false
    }
  }, [setInvoices, setIsLoading])

  // Combine and deduplicate client invoices from store
  const allInvoices = [
    ...adminInvoices.filter((i) => i.status === 'sent' || i.status === 'paid' || i.status === 'overdue'),
    ...portalInvoices.filter((pi) => !adminInvoices.some((ai) => ai.invoiceId === pi.invoiceId)),
  ]

  const handlePayNow = (inv) => {
    updateInvoiceStatus(inv.invoiceId, 'paid')
    if (selectedInvoice && selectedInvoice.invoiceId === inv.invoiceId) {
      setSelectedInvoice({ ...selectedInvoice, status: 'paid' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Invoices & Payment History"
          description="View client invoices, project billing breakdown, payment receipts, and download professional PDF copies"
        />

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <NavLink
            to="/portal"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Layers className="w-3.5 h-3.5" /> Portal Overview
          </NavLink>
          <NavLink
            to="/portal/projects"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Briefcase className="w-3.5 h-3.5" /> Projects Status
          </NavLink>
          <NavLink
            to="/portal/invoices"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <FileText className="w-3.5 h-3.5" /> Invoices & Receipts
          </NavLink>
          <NavLink
            to="/portal/files"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Download className="w-3.5 h-3.5" /> Deliverables & Files
          </NavLink>
        </div>
      </div>

      {/* Invoices Table */}
      <Card className="overflow-x-auto p-0 border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400">
              <th className="p-4 font-semibold">Invoice #</th>
              <th className="p-4 font-semibold">Associated Project</th>
              <th className="p-4 font-semibold">Issue Date</th>
              <th className="p-4 font-semibold">Due Date</th>
              <th className="p-4 font-semibold">Amount (₹)</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-400 mb-2" />
                  <span className="text-xs">Loading client invoices...</span>
                </td>
              </tr>
            ) : allInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">
                  No invoices available yet.
                </td>
              </tr>
            ) : (
              allInvoices.map((inv) => (
                <tr
                  key={inv.invoiceId}
                  className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <td className="p-4 font-bold text-slate-200">{inv.invoiceNumber}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 font-medium text-[11px] border border-indigo-900/40">
                      <Briefcase className="w-3 h-3" />
                      {inv.projectName || 'SaaS Platform Redesign'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{inv.issueDate}</td>
                  <td className="p-4 text-slate-400">{inv.dueDate}</td>
                  <td className="p-4 font-bold text-slate-100">
                    ₹{(inv.total || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-4">
                    <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : 'info'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => downloadInvoiceAsPDF(inv)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors text-xs font-medium"
                      title="Download PDF Invoice File"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Download PDF</span>
                    </button>

                    {inv.status !== 'paid' && (
                      <Button size="sm" variant="primary" icon={CreditCard} onClick={() => handlePayNow(inv)}>
                        Pay Now
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Professional Invoice Modal */}
      {selectedInvoice && (
        <ProfessionalInvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  )
}
