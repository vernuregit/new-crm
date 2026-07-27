import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useFinanceStore } from './stores/financeStore'
import { getInvoices, createInvoice, updateInvoiceStatusInDb, deleteInvoiceFromDb } from './services/financeService'
import {
  Plus,
  Search,
  IndianRupee,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Download,
  Send,
  Trash2,
  X,
  PlusCircle,
  CreditCard
} from 'lucide-react'

export const InvoiceList = () => {
  const {
    invoices,
    addInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    invoiceStatusFilter,
    setInvoiceStatusFilter,
    setInvoices,
  } = useFinanceStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  // Invoice form state
  const [clientName, setClientName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [taxRate, setTaxRate] = useState(10)
  const [lineItems, setLineItems] = useState([
    { description: 'Professional Consulting Services', quantity: 1, unitPrice: 5000 },
  ])

  useEffect(() => {
    const fetchRealInvoices = async () => {
      const data = await getInvoices()
      if (data) {
        setInvoices(data)
      }
    }
    fetchRealInvoices()
  }, [setInvoices])

  // Filtered invoices
  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      !searchQuery ||
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.clientName && inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesStatus =
      invoiceStatusFilter === 'all' || inv.status === invoiceStatusFilter
    return matchesSearch && matchesStatus
  })

  // Finance Metrics
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total || 0), 0)
  const totalCollected = invoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + (i.total || 0), 0)
  const totalOverdue = invoices
    .filter((i) => i.status === 'overdue')
    .reduce((sum, i) => sum + (i.amountDue || 0), 0)

  // Line item helpers
  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unitPrice: 0 },
    ])
  }

  const handleLineItemChange = (index, field, value) => {
    const updated = [...lineItems]
    updated[index][field] = field === 'description' ? value : Number(value)
    setLineItems(updated)
  }

  const handleRemoveLineItem = (index) => {
    if (lineItems.length === 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice || 0),
    0
  )
  const taxTotal = Math.round(subtotal * (taxRate / 100))
  const grandTotal = subtotal + taxTotal

  const handleCreateInvoice = async (e) => {
    e.preventDefault()
    if (!clientName.trim()) return

    const processedLineItems = lineItems.map((item) => ({
      ...item,
      amount: item.quantity * item.unitPrice,
    }))

    const payload = {
      clientName,
      dueDate: dueDate || new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
      subtotal,
      taxTotal,
      total: grandTotal,
      lineItems: processedLineItems,
      invoiceNumber: `INV-2024-${String(invoices.length + 1).padStart(3, '0')}`,
      status: 'sent',
      issueDate: new Date().toISOString().split('T')[0],
      amountPaid: 0,
      amountDue: grandTotal,
      currency: 'INR',
    }

    const created = await createInvoice(payload)
    addInvoice(created)

    setClientName('')
    setLineItems([{ description: 'Professional Consulting Services', quantity: 1, unitPrice: 5000 }])
    setShowAddModal(false)
  }

  const handleStatusChange = async (invoiceId, status) => {
    updateInvoiceStatus(invoiceId, status)
    await updateInvoiceStatusInDb(invoiceId, status)
  }

  const handleDeleteInvoice = async (invoiceId) => {
    if (selectedInvoice?.invoiceId === invoiceId) {
      setSelectedInvoice(null)
    }
    deleteInvoice(invoiceId)
    await deleteInvoiceFromDb(invoiceId)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Finance & Invoicing Engine"
          description="Client billing, quotes, credit notes, overdue reminders, and expense tracking"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              Create Invoice
            </Button>
          }
        />

        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <NavLink
              to="/finance/invoices"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                    ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <Clock className="w-3.5 h-3.5" /> Recurring Billing
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              className="bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="sent">Sent</option>
              <option value="overdue">Overdue</option>
              <option value="draft">Draft</option>
            </select>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search invoice #, client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Finance Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Invoiced
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              ₹{totalInvoiced.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <IndianRupee className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Collected Revenue
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              ₹{totalCollected.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Outstanding Overdue
            </span>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              ₹{totalOverdue.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="overflow-x-auto p-0 border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
              <th className="p-4 font-semibold">Invoice #</th>
              <th className="p-4 font-semibold">Client Name</th>
              <th className="p-4 font-semibold">Issue Date</th>
              <th className="p-4 font-semibold">Due Date</th>
              <th className="p-4 font-semibold">Total Amount</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr
                  key={inv.invoiceId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <td className="p-4 font-bold text-slate-900 dark:text-slate-200">{inv.invoiceNumber}</td>
                  <td className="p-4 text-slate-800 dark:text-slate-300 font-medium">{inv.clientName}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{inv.issueDate}</td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{inv.dueDate}</td>
                  <td className="p-4 font-bold text-slate-900 dark:text-slate-100">
                    ₹{inv.total.toLocaleString('en-IN')}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={inv.status}
                      onChange={(e) => handleStatusChange(inv.invoiceId, e.target.value)}
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 rounded px-2 py-1 focus:outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="p-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDeleteInvoice(inv.invoiceId)}
                      className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Create Invoice Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative max-h-[90vh] overflow-y-auto bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Create New Invoice</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Client Name"
                  placeholder="e.g. Acme Corp"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Line Items Section */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Line Items</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={PlusCircle}
                    onClick={handleAddLineItem}
                  >
                    Add Item
                  </Button>
                </div>

                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Item Description"
                      value={item.description}
                      onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                      className="flex-1 bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 transition-all"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                      className="w-16 bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price (₹)"
                      value={item.unitPrice}
                      onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                      className="w-28 bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(index)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Calculations Summary */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Tax Rate (%):</span>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-16 bg-white dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-xs rounded px-2 py-0.5 text-right focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-between text-slate-900 dark:text-slate-100 font-bold text-sm pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Generate Invoice
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* View Invoice Modal / Details */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{selectedInvoice.invoiceNumber}</h3>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{selectedInvoice.clientName}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {selectedInvoice.lineItems?.map((item, idx) => (
                <div key={idx} className="flex justify-between py-1.5 border-b border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
                  <span>{item.description} ({item.quantity}x)</span>
                  <span className="font-semibold">₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}</span>
                </div>
              ))}

              <div className="pt-3 flex justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400">
                <span>Total Amount:</span>
                <span>₹{selectedInvoice.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button variant="secondary" size="sm" className="w-full" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
