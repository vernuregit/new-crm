import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
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
import {
  getMRR,
  getCRMPipeline,
  getProjectStats,
  getHealthScore,
  getRecentActivity,
} from './services/dashboardService'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val) => {
  if (val >= 10_000_000) {
    return `₹${(val / 10_000_000).toFixed(2)} Cr`
  }
  if (val >= 100_000) {
    return `₹${(val / 100_000).toFixed(2)} Lakh`
  }
  if (val >= 1_000) {
    return `₹${(val / 1_000).toFixed(1)}K`
  }
  return `₹${val.toLocaleString('en-IN')}`
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

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800/60 rounded-lg ${className}`} />
)

// ─── Main Component ───────────────────────────────────────────────────────────

export const FounderDashboard = () => {
  const navigate = useNavigate()
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
          getMRR(),
          getCRMPipeline(),
          getProjectStats(),
          getHealthScore(),
          getRecentActivity(),
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

  useEffect(() => {
    load()
  }, [load])

  // ─── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Executive Operations Dashboard"
          description="Real-time multi-tenant health metrics and business intelligence"
          actions={
            <Button icon={RefreshCw} variant="primary" onClick={load}>
              Retry
            </Button>
          }
        />
        <Card className="flex items-center gap-3 text-rose-500 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </Card>
      </div>
    )
  }

  // ─── Health breakdown bar values ────────────────────────────────────────────
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
            <Button icon={Plus} variant="primary" onClick={() => navigate('/projects/list')}>
              New Project
            </Button>
          </div>
        }
      />

      {/* ── Top Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* MRR */}
        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Monthly Recurring Revenue
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <>
                <Skeleton className="h-7 w-28 mb-2" />
                <Skeleton className="h-3 w-36" />
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {mrr?.mrr != null ? formatCurrency(mrr.mrr) : '—'}
                </span>
                {mrr?.changePercent != null && (
                  <div
                    className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                      Number(mrr.changePercent) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {Number(mrr.changePercent) >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {mrr.changePercent > 0 ? '+' : ''}
                      {mrr.changePercent}% vs last month
                    </span>
                  </div>
                )}
                {mrr?.changePercent == null && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">No prior month data</p>
                )}
              </>
            )}
          </div>
        </Card>

        {/* CRM Pipeline */}
        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active CRM Pipeline
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <>
                <Skeleton className="h-7 w-28 mb-2" />
                <Skeleton className="h-3 w-40" />
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {pipeline?.pipelineValue != null
                    ? formatCurrency(pipeline.pipelineValue)
                    : '—'}
                </span>
                <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>
                    {pipeline?.activeCount ?? 0} Active Opportunit
                    {pipeline?.activeCount === 1 ? 'y' : 'ies'}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Active Projects */}
        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Projects
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <>
                <Skeleton className="h-7 w-20 mb-2" />
                <Skeleton className="h-3 w-36" />
              </>
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
                      : 'Milestone data pending'}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Business Health Score */}
        <Card hover className="border-indigo-300 dark:border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Business Health Score
            </span>
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

      {/* ── Main Grid: Activity & Health ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">
              Recent Operations Activity
            </h3>
            <Badge variant="brand">Live Feed</Badge>
          </div>

          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60"
                >
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
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                No recent activity found.
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
                          <Clock className="w-3 h-3" />
                          {timeAgo(item.createdAt)}
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
                {
                  label: 'CRM & Pipeline Health',
                  pct: crmPct,
                  color: 'bg-emerald-500',
                  textColor: 'text-emerald-600 dark:text-emerald-400',
                },
                {
                  label: 'Finance & Liquidity',
                  pct: financePct,
                  color: 'bg-indigo-500',
                  textColor: 'text-indigo-600 dark:text-indigo-400',
                },
                {
                  label: 'Project On-Time Velocity',
                  pct: projectsPct ?? projects?.onTimeRate,
                  color: 'bg-purple-500',
                  textColor: 'text-purple-600 dark:text-purple-400',
                },
              ].map(({ label, pct, color, textColor }) => (
                <div key={label}>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1.5 font-medium">
                    <span>{label}</span>
                    {pct != null ? (
                      <span className={`${textColor} font-semibold`}>{pct}%</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">—</span>
                    )}
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-200/60 dark:border-none">
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
                  No health score data available yet.
                  <br />
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    Save a health snapshot from the KPI Engine.
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

