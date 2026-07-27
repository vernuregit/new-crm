import { create } from 'zustand'

const DEMO_CLIENT_PROJECTS = [
  {
    projectId: 'proj_201',
    name: 'SaaS Platform Redesign',
    description: 'Complete UI/UX refactor with Tailwind CSS & React 19',
    status: 'active',
    completionPercent: 75,
    ownerName: 'Sarah Jenkins',
    nextMilestone: 'Phase 2 Mobile UI Sign-off',
    dueDate: '2024-08-15',
  },
]

const DEMO_CLIENT_INVOICES = [
  {
    invoiceId: 'inv_301',
    invoiceNumber: 'INV-2024-001',
    issueDate: '2024-07-01',
    dueDate: '2024-07-15',
    total: 11000,
    status: 'paid',
    downloadUrl: '#',
  },
  {
    invoiceId: 'inv_302',
    invoiceNumber: 'INV-2024-002',
    issueDate: '2024-07-10',
    dueDate: '2024-07-24',
    total: 8800,
    status: 'sent',
    downloadUrl: '#',
  },
]

const DEMO_CLIENT_FILES = [
  {
    fileId: 'file_901',
    filename: 'Master_Services_Agreement_2024.pdf',
    category: 'Contract',
    size: '2.4 MB',
    uploadedAt: '2024-07-01',
  },
  {
    fileId: 'file_902',
    filename: 'Phase_1_UI_Design_Tokens_Spec.pdf',
    category: 'Deliverable',
    size: '5.1 MB',
    uploadedAt: '2024-07-15',
  },
]

const DEMO_APPROVALS = [
  {
    approvalId: 'app_101',
    title: 'Phase 2 Mobile UI Wireframes & Token Specs',
    projectName: 'SaaS Platform Redesign',
    requestedAt: '2024-07-20',
    status: 'pending',
    notes: 'Please review and approve the updated dark-mode responsive layouts.',
  },
]

export const usePortalStore = create((set) => ({
  projects: DEMO_CLIENT_PROJECTS,
  invoices: DEMO_CLIENT_INVOICES,
  files: DEMO_CLIENT_FILES,
  approvals: DEMO_APPROVALS,

  approveDeliverable: (approvalId) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.approvalId === approvalId ? { ...a, status: 'approved' } : a
      ),
    })),

  rejectDeliverable: (approvalId) =>
    set((state) => ({
      approvals: state.approvals.map((a) =>
        a.approvalId === approvalId ? { ...a, status: 'rejected' } : a
      ),
    })),
}))
