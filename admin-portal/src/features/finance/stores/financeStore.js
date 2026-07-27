import { create } from 'zustand'

export const useFinanceStore = create((set) => ({
  invoices: [],
  expenses: [],
  selectedInvoice: null,
  invoiceStatusFilter: 'all',

  setInvoices: (invoices) => set({ invoices }),
  setExpenses: (expenses) => set({ expenses }),
  setSelectedInvoice: (selectedInvoice) => set({ selectedInvoice }),
  setInvoiceStatusFilter: (invoiceStatusFilter) => set({ invoiceStatusFilter }),

  addInvoice: (newInv) =>
    set((state) => ({
      invoices: [
        {
          invoiceId: `inv_${Date.now()}`,
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(state.invoices.length + 1).padStart(3, '0')}`,
          status: 'sent',
          issueDate: new Date().toISOString().split('T')[0],
          amountPaid: 0,
          amountDue: newInv.total,
          currency: 'INR',
          ...newInv,
        },
        ...state.invoices,
      ],
    })),

  updateInvoiceStatus: (invoiceId, newStatus) =>
    set((state) => ({
      invoices: state.invoices.map((inv) => {
        if (inv.invoiceId !== invoiceId) return inv
        const isPaid = newStatus === 'paid'
        return {
          ...inv,
          status: newStatus,
          amountPaid: isPaid ? inv.total : inv.amountPaid,
          amountDue: isPaid ? 0 : inv.total,
        }
      }),
    })),

  deleteInvoice: (invoiceId) =>
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.invoiceId !== invoiceId),
    })),

  addExpense: (newExp) =>
    set((state) => ({
      expenses: [
        {
          expenseId: `exp_${Date.now()}`,
          status: 'approved',
          date: new Date().toISOString().split('T')[0],
          ...newExp,
        },
        ...state.expenses,
      ],
    })),

  deleteExpense: (expenseId) =>
    set((state) => ({
      expenses: state.expenses.filter((exp) => exp.expenseId !== expenseId),
    })),
}))
