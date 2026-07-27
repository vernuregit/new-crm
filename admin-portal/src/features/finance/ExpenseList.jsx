import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useFinanceStore } from './stores/financeStore'
import { FileText, CreditCard, Clock, Plus, Trash2, X } from 'lucide-react'

export const ExpenseList = () => {
  const { expenses, addExpense, deleteExpense } = useFinanceStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [vendor, setVendor] = useState('')
  const [category, setCategory] = useState('Software & Infrastructure')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')

  const handleCreateExpense = (e) => {
    e.preventDefault()
    if (!vendor.trim()) return

    addExpense({
      vendor,
      category,
      amount: Number(amount) || 0,
      notes,
    })

    setVendor('')
    setAmount('')
    setNotes('')
    setShowAddModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Expenses & Vendor Tracking"
          description="Track operational expenses, vendor invoices, software subscriptions, and outgoing cashflow"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              Log Expense
            </Button>
          }
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

      {/* Expenses Table */}
      <Card className="overflow-x-auto p-0 border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400">
              <th className="p-4 font-semibold">Vendor</th>
              <th className="p-4 font-semibold">Category</th>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Notes</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {expenses.map((exp) => (
              <tr key={exp.expenseId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-4 font-bold text-slate-900 dark:text-slate-200">{exp.vendor}</td>
                <td className="p-4 text-slate-700 dark:text-slate-300">{exp.category}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">{exp.date}</td>
                <td className="p-4 font-bold text-rose-600 dark:text-rose-400">₹{exp.amount?.toLocaleString('en-IN')}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{exp.notes || '—'}</td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => deleteExpense(exp.expenseId)}
                    className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Create Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Log Expense</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <Input
                label="Vendor Name"
                placeholder="e.g. AWS, Google Cloud, Stripe"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                required
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Software & Infrastructure" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Software & Infrastructure</option>
                  <option value="Marketing & Ads" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Marketing & Ads</option>
                  <option value="Office & Supplies" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Office & Supplies</option>
                  <option value="Legal & Advisory" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Legal & Advisory</option>
                  <option value="Travel & Meals" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Travel & Meals</option>
                </select>
              </div>

              <Input
                label="Amount (₹ INR)"
                type="number"
                placeholder="1200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />

              <Input
                label="Notes / Description"
                placeholder="e.g. Monthly server hosting costs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Save Expense
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
