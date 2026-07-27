import React from 'react'
import { PageHeader } from '../../shared/components/layout/PageHeader'
import { Card } from '../../shared/components/ui/Card'
import { Badge } from '../../shared/components/ui/Badge'
import { Button } from '../../shared/components/ui/Button'
import {
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  Activity,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock
} from 'lucide-react'

export const FounderDashboard = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Operations Dashboard"
        description="Real-time multi-tenant health metrics and business intelligence"
        actions={
          <Button icon={Plus} variant="primary">
            New Project
          </Button>
        }
      />

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Recurring Revenue</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">$84,250</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+14.2% vs last month</span>
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active CRM Pipeline</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">$340,000</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>28 Active Opportunities</span>
            </div>
          </div>
        </Card>

        <Card hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Projects</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">18 / 20</span>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>90% on-time milestone rate</span>
            </div>
          </div>
        </Card>

        <Card hover className="border-indigo-300 dark:border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Business Health Score</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              92 / 100
            </span>
            <Badge variant="success">Optimal</Badge>
          </div>
        </Card>
      </div>

      {/* Main Grid: Activity & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm">Recent Operations Activity</h3>
            <Badge variant="brand">Real-time Stream</Badge>
          </div>

          <div className="space-y-3">
            {[
              { title: 'Invoice INV-2024-089 paid by Apex Corp', time: '10 mins ago', type: 'finance', amount: '+$12,500' },
              { title: 'New lead qualified: Nexus Systems Tech', time: '45 mins ago', type: 'crm', amount: '$45,000' },
              { title: 'Milestone "Phase 2 Mobile UI" completed', time: '2 hours ago', type: 'project', amount: 'Project Alpha' },
              { title: 'Quarterly Financial Digest generated', time: '5 hours ago', type: 'system', amount: 'PDF Ready' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{activity.title}</p>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {activity.time}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{activity.amount}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Business Health Summary */}
        <Card className="space-y-4">
          <h3 className="font-semibold text-slate-900 dark:text-slate-200 text-sm pb-3 border-b border-slate-200 dark:border-slate-800">Health Breakdown</h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                <span>CRM & Pipeline Health</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">95%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[95%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                <span>Finance & Liquidity</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold">88%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-[88%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                <span>Project On-Time Velocity</span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold">92%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[92%]" />
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  )
}
