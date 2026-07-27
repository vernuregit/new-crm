import React, { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { usePortalStore } from './stores/portalStore'
import { getClientProjects, getClientInvoices, getClientDeliverables } from './services/portalService'
import {
  ShieldCheck,
  Briefcase,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Check,
  X,
  CreditCard
} from 'lucide-react'

export const ClientPortal = () => {
  const {
    projects,
    invoices,
    files,
    approvals,
    setProjects,
    setInvoices,
    setFiles,
    approveDeliverable,
    rejectDeliverable,
  } = usePortalStore()

  useEffect(() => {
    const fetchPortalData = async () => {
      const projs = await getClientProjects()
      const invs = await getClientInvoices()
      const delivs = await getClientDeliverables()
      if (projs && projs.length > 0) setProjects(projs)
      if (invs && invs.length > 0) setInvoices(invs)
      if (delivs && delivs.length > 0) setFiles(delivs)
    }
    fetchPortalData()
  }, [setProjects, setInvoices, setFiles])

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')
  const openBalance = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + i.total, 0)

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Client Portal Environment"
          description="Tenant-isolated workspace for tracking your project deliverables, approving milestones, and managing invoices"
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

      {/* Security Isolation Banner */}
      <Card className="p-4 border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-500/10 dark:to-purple-500/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">Secure Client Isolation Active</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Filtered exclusively for <strong className="text-slate-900 dark:text-slate-200">Acme Corp</strong> via Custom Claims & Firestore Path Rules.
            </p>
          </div>
        </div>
        <Badge variant="brand">Client Portal Tier</Badge>
      </Card>

      {/* Portal Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Projects
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{projects.length}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Approvals
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingApprovals.length}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Outstanding Balance
            </span>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              ${openBalance.toLocaleString()}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Deliverable Approvals Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Deliverable Sign-offs Needed</h3>
        {approvals.map((app) => (
          <Card key={app.approvalId} hover className="flex items-center justify-between p-4 border-slate-200 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{app.title}</h4>
                <Badge variant={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}>
                  {app.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{app.notes}</p>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Project: {app.projectName} • Requested: {app.requestedAt}</span>
            </div>

            {app.status === 'pending' && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  icon={Check}
                  onClick={() => approveDeliverable(app.approvalId)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={X}
                  onClick={() => rejectDeliverable(app.approvalId)}
                >
                  Request Changes
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Project Status Overview */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Project Progress Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <Card key={p.projectId} hover className="space-y-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{p.name}</h4>
                <Badge variant="brand">{p.completionPercent}% Completed</Badge>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">{p.description}</p>
              <div className="w-full bg-slate-100 dark:bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-800">
                <div className="bg-indigo-600 dark:bg-indigo-500 h-full" style={{ width: `${p.completionPercent}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Next Milestone: {p.nextMilestone}</span>
                <span>Due: {p.dueDate}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
