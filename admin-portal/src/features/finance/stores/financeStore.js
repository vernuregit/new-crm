import { create } from 'zustand'

export const useFinanceStore = create((set) => ({
  invoices: [],
  expenses: [],
  isLoading: true,
  selectedInvoice: null,
  invoiceStatusFilter: 'all',

  setInvoices: (invoices) =>
    set({
      invoices: Array.isArray(invoices) ? invoices : [],
      isLoading: false,
    }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setExpenses: (expenses) => set({ expenses }),
  setSelectedInvoice: (selectedInvoice) => set({ selectedInvoice }),
  setInvoiceStatusFilter: (invoiceStatusFilter) => set({ invoiceStatusFilter }),

  addInvoice: (newInv) =>
    set((state) => ({
      invoices: [
        {
          invoiceId: newInv.invoiceId || `inv_${Date.now()}`,
          invoiceNumber: newInv.invoiceNumber || `INV-${new Date().getFullYear()}-${String(state.invoices.length + 1).padStart(3, '0')}`,
          status: newInv.status || 'draft',
          issueDate: new Date().toISOString().split('T')[0],
          amountPaid: 0,
          amountDue: newInv.total || 0,
          currency: 'INR',
          ...newInv,
        },
        ...state.invoices,
      ],
    })),

  sendInvoiceToClient: (invoiceId) =>
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.invoiceId === invoiceId
          ? {
              ...inv,
              status: 'sent',
              sentAt: new Date().toLocaleString(),
            }
          : inv
      ),
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
      expenses: state.expenses.filter((e) => e.expenseId !== expenseId),
    })),
}))
