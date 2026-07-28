import React, { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Briefcase,
  Activity,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val) => {
  if (val == null) return '—'
  if (val >= 10_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
  return `$${val.toLocaleString()}`
}

const timeAgo = (iso) => {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800/60 rounded-lg ${className}`} />
)

// ─── Firestore fetchers ───────────────────────────────────────────────────────

const fetchMRR = async () => {
  const snap = await getDocs(collection(db, 'invoices'))
  const now = new Date()
  const cm = now.getMonth(), cy = now.getFullYear()
  let mrr = 0, prevMrr = 0

  snap.docs.forEach((d) => {
    const data = d.data()
    if (data.status !== 'paid' && data.status !== 'Paid') return
    const at = data.createdAt ? new Date(data.createdAt) : null
    if (!at) return
    const amt = Number(data.amount) || Number(data.total) || 0
    if (at.getMonth() === cm && at.getFullYear() === cy) mrr += amt
    const pm = cm === 0 ? 11 : cm - 1
    const py = cm === 0 ? cy - 1 : cy
    if (at.getMonth() === pm && at.getFullYear() === py) prevMrr += amt
  })

  const changePercent = prevMrr > 0
    ? (((mrr - prevMrr) / prevMrr) * 100).toFixed(1)
    : null

  return { mrr, changePercent }
}

const fetchPipeline = async () => {
  const snap = await getDocs(collection(db, 'leads'))
  const closed = ['closed_won', 'closed_lost', 'won', 'lost']
  let pipelineValue = 0, activeCount = 0

  snap.docs.forEach((d) => {
    const data = d.data()
    if (closed.includes((data.pipelineStageId || '').toLowerCase())) return
    pipelineValue += Number(data.estimatedValue) || Number(data.value) || 0
    activeCount++
  })

  return { pipelineValue, activeCount }
}

const fetchProjects = async () => {
  const snap = await getDocs(collection(db, 'projects'))
  const all = snap.docs.map((d) => d.data())
  const total = all.length
  const active = all.filter(
    (p) => ['active', 'in_progress', 'Active', 'In Progress'].includes(p.status)
  ).length

  const taskSnap = await getDocs(collection(db, 'tasks'))
  const done = taskSnap.docs
    .map((d) => d.data())
    .filter((t) => t.status === 'done' || t.status === 'completed')
  const onTime = done.filter((t) => {
    if (!t.dueDate || !t.completedAt) return true
    return new Date(t.completedAt) <= new Date(t.dueDate)
  })
  const onTimeRate = done.length > 0
    ? Math.round((onTime.length / done.length) * 100)
    : null

  return { active, total, onTimeRate }
}

const fetchHealth = async () => {
  const q = query(collection(db, 'healthScores'), orderBy('calculatedAt', 'desc'), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    const d = snap.docs[0].data()
    return {
      overall: d.overall ?? d.score ?? null,
      crm: d.crm ?? null,
      finance: d.finance ?? null,
      projects: d.projects ?? null,
    }
  }
  return { overall: null, crm: null, finance: null, projects: null }
}

const fetchActivity = async () => {
  const [invSnap, leadSnap, projSnap] = await Promise.all([
    getDocs(query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(10))),
    getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(5))),
  ])

  const activities = []

  invSnap.docs.forEach((d) => {
    const data = d.data()
    if (data.status === 'paid' || data.status === 'Paid') {
      const amt = Number(data.amount || data.total || 0)
      activities.push({
        id: d.id,
        title: `Invoice ${data.invoiceNumber || d.id.slice(0, 8).toUpperCase()} paid${data.clientName ? ` by ${data.clientName}` : ''}`,
        label: amt ? `+$${amt.toLocaleString()}` : 'Paid',
        createdAt: data.createdAt || '',
      })
    }
  })

  leadSnap.docs.forEach((d) => {
    const data = d.data()
    const amt = Number(data.estimatedValue || data.value || 0)
    activities.push({
      id: d.id,
      title: `New lead: ${data.name || data.companyName || 'Unknown'}`,
      label: amt ? `$${amt.toLocaleString()}` : 'Lead',
      createdAt: data.createdAt || '',
    })
  })

  projSnap.docs.forEach((d) => {
    const data = d.data()
    if (data.status === 'completed' || data.status === 'done') {
      activities.push({
        id: d.id,
        title: `Project "${data.name || data.title}" completed`,
        label: 'Completed',
        createdAt: data.createdAt || '',
      })
    }
  })

  activities.sort((a, b) => {
    if (!a.createdAt) return 1
    if (!b.createdAt) return -1
    return new Date(b.createdAt) - new Date(a.createdAt)
  })

  return activities.slice(0, 4)
}

// ─── Component ────────────────────────────────────────────────────────────────

export const FounderDashboard = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mrr, setMrr] = useState(null)
  const [pipeline, setPipeline] = useState(null)
  const [projects, setProjects] = useState(null)
  const [health, setHealth] = useState(null)
  const [activity, setActivity] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mrrData, pipelineData, projectData, healthData, activityData] =
        await Promise.all([
          fetchMRR(),
          fetchPipeline(),
          fetchProjects(),
          fetchHealth(),
          fetchActivity(),
        ])
      setMrr(mrrData)
      setPipeline(pipelineData)
      setProjects(projectData)
      setHealth(healthData)
      setActivity(activityData)
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Executive Operations Dashboard"
          description="Real-time multi-tenant health metrics and business intelligence"
          actions={<Button icon={RefreshCw} variant="primary" onClick={load}>Retry</Button>}
        />
        <Card className="flex items-center gap-3 text-rose-500 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </Card>
      </div>
    )
  }

  const crmPct = health?.crm ?? null
  const financePct = health?.finance ?? null
  const projectsPct = health?.projects ?? null
  const overallScore = health?.overall ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Operations Dashboard"
        description="Real-time multi-tenant health metrics and business intelligence"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Button icon={Plus} variant="primary">New Project</Button>
          </div>
        }
      />

      {/* ── Stat Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* MRR */}
        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Recurring Revenue</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <><Skeleton className="h-7 w-28 mb-2" /><Skeleton className="h-3 w-36" /></>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {mrr?.mrr != null ? fmt(mrr.mrr) : '—'}
                </span>
                {mrr?.changePercent != null ? (
                  <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${Number(mrr.changePercent) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {Number(mrr.changePercent) >= 0
                      ? <TrendingUp className="w-3.5 h-3.5" />
                      : <TrendingDown className="w-3.5 h-3.5" />}
                    <span>{mrr.changePercent > 0 ? '+' : ''}{mrr.changePercent}% vs last month</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">No paid invoices yet</p>
                )}
              </>
            )}
          </div>
        </Card>

        {/* CRM Pipeline */}
        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active CRM Pipeline</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <><Skeleton className="h-7 w-28 mb-2" /><Skeleton className="h-3 w-40" /></>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {pipeline?.pipelineValue != null ? fmt(pipeline.pipelineValue) : '—'}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{pipeline?.activeCount ?? 0} Active Opportunit{pipeline?.activeCount === 1 ? 'y' : 'ies'}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Active Projects */}
        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Projects</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <><Skeleton className="h-7 w-20 mb-2" /><Skeleton className="h-3 w-36" /></>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {projects?.active != null
                    ? `${projects.active}${projects.total ? ` / ${projects.total}` : ''}`
                    : '—'}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {projects?.onTimeRate != null
                      ? `${projects.onTimeRate}% on-time milestone rate`
                      : 'No milestone data yet'}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Business Health Score */}
        <Card hover className="border-indigo-300 dark:border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Business Health Score</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            {loading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <>
                <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  {overallScore != null ? `${overallScore} / 100` : '— / 100'}
                </span>
                {overallScore != null && (
                  <Badge variant={overallScore >= 80 ? 'success' : overallScore >= 60 ? 'warning' : 'danger'}>
                    {overallScore >= 80 ? 'Optimal' : overallScore >= 60 ? 'Fair' : 'At Risk'}
                  </Badge>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">Recent Operations Activity</h3>
            <Badge variant="brand">Real-time Stream</Badge>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-52" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-600">
                <Clock className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs">No recent activity</p>
              </div>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
                      {item.createdAt && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" /> {timeAgo(item.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0 ml-4">
                    {item.label}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Health Breakdown */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm pb-3 border-b border-slate-200 dark:border-slate-800">
            Health Breakdown
          </h3>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {[
                { label: 'CRM & Pipeline Health', pct: crmPct, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Finance & Liquidity', pct: financePct, color: 'bg-indigo-500', textColor: 'text-indigo-600 dark:text-indigo-400' },
                { label: 'Project On-Time Velocity', pct: projectsPct ?? projects?.onTimeRate, color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400' },
              ].map(({ label, pct, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
                    <span>{label}</span>
                    {pct != null
                      ? <span className={`${textColor} font-semibold`}>{pct}%</span>
                      : <span className="text-slate-400 dark:text-slate-600">—</span>}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    {pct != null && (
                      <div
                        className={`${color} h-full rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {crmPct == null && financePct == null && projectsPct == null && (
                <p className="text-slate-500 dark:text-slate-400 text-center py-2">
                  No health score data yet.{' '}
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    Generate from KPI Engine.
                  </span>
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
