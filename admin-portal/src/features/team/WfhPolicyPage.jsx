import React, { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useUserStore } from '../../stores/userStore'
import { useTeamStore } from './stores/teamStore'
import { getEmployees, saveEmployeeWfhPolicy } from './services/teamService'
import {
  resolveEmployeeWfhPolicy,
  getWfhAllowanceLabel,
} from './services/wfhPolicyUtils'
import { TeamSubNav } from './components/TeamSubNav'
import {
  Save,
  Check,
  X,
  Search,
} from 'lucide-react'

const MODE_OPTIONS = [
  {
    value: 'off',
    title: 'Off',
    description: 'Employee cannot request Work From Home.',
  },
  {
    value: 'full',
    title: 'Full WFH',
    description: 'Permanent remote — no WFH leave requests needed.',
  },
  {
    value: 'weekly',
    title: 'Weekly',
    description: 'Request WFH within a weekly day limit. Auto-approved (no admin review).',
  },
  {
    value: 'monthly',
    title: 'Monthly',
    description: 'Request WFH within a monthly day limit. Requires admin approval.',
  },
]

const badgeClassForMode = (mode) => {
  if (mode === 'full') return 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
  if (mode === 'weekly') return 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
  if (mode === 'monthly') return 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
}

export const WfhPolicyPage = () => {
  const { user } = useUserStore()
  const adminName = user?.displayName || user?.email || 'Admin'
  const { employees, setEmployees, updateEmployee } = useTeamStore()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [mode, setMode] = useState('off')
  const [limit, setLimit] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getEmployees().then((list) => {
      if (list?.length) setEmployees(list)
    })
  }, [setEmployees])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((emp) => {
      const name = (emp.displayName || emp.name || '').toLowerCase()
      const email = (emp.email || '').toLowerCase()
      const dept = (emp.department || emp.role || '').toLowerCase()
      return name.includes(q) || email.includes(q) || dept.includes(q)
    })
  }, [employees, search])

  const openEditor = (emp) => {
    const policy = resolveEmployeeWfhPolicy(emp)
    setSelected(emp)
    setMode(policy.mode)
    setLimit(policy.limit)
    setSaved(false)
  }

  const closeEditor = () => {
    setSelected(null)
    setSaved(false)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!selected) return
    const uid = selected.uid || selected.employeeId
    if (!uid) return

    setSaving(true)
    const data = await saveEmployeeWfhPolicy(
      uid,
      { wfhMode: mode, wfhLimit: limit },
      adminName
    )
    updateEmployee(uid, {
      wfhMode: data.wfhMode,
      wfhLimit: data.wfhLimit,
      wfhUpdatedBy: data.wfhUpdatedBy,
    })
    setSelected((prev) => (prev ? { ...prev, ...data } : prev))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          title="WFH Policy"
          description="Set each employee’s Work From Home type: Off, Full WFH, Weekly, or Monthly."
        />

        <TeamSubNav />
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <Card className="overflow-x-auto p-0 border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
              <th className="p-4 font-semibold">Employee</th>
              <th className="p-4 font-semibold">Department / Role</th>
              <th className="p-4 font-semibold">WFH Policy</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">
                  No employees found.
                </td>
              </tr>
            )}
            {filtered.map((emp) => {
              const policy = resolveEmployeeWfhPolicy(emp)
              const name = emp.displayName || emp.name || 'Employee'
              const initials = name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0].toUpperCase())
                .join('')
              return (
                <tr
                  key={emp.uid || emp.employeeId}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  onClick={() => openEditor(emp)}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials || 'E'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{emp.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    {emp.department || emp.role || emp.designation || '—'}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${badgeClassForMode(policy.mode)}`}
                    >
                      {getWfhAllowanceLabel(policy)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditor(emp)
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative rounded-2xl bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Set WFH Policy
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selected.displayName || selected.name}
                  {selected.email ? ` · ${selected.email}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                {MODE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      mode === opt.value
                        ? 'border-indigo-300 dark:border-indigo-500/40 bg-indigo-50/60 dark:bg-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emp-wfh-mode"
                      value={opt.value}
                      checked={mode === opt.value}
                      onChange={() => setMode(opt.value)}
                      className="mt-1 w-4 h-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {opt.title}
                      </span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {opt.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {(mode === 'weekly' || mode === 'monthly') && (
                <Input
                  label={mode === 'weekly' ? 'WFH days allowed per week' : 'WFH days allowed per month'}
                  type="number"
                  min={1}
                  max={mode === 'weekly' ? 7 : 31}
                  value={limit}
                  onChange={(e) => setLimit(Math.max(1, Number(e.target.value) || 1))}
                  required
                />
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="secondary" className="w-1/3" onClick={closeEditor}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-2/3"
                  icon={saved ? Check : Save}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : saved ? 'Saved' : 'Save Policy'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
