import React, { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useTeamStore } from './stores/teamStore'
import { getEmployees } from './services/teamService'
import {
  fetchEmployeeTimelineEntries,
  getWeekDates,
  toDateStr,
} from './services/timelineService'
import {
  Users,
  CheckCircle2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  PartyPopper,
} from 'lucide-react'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatHours(hours) {
  const n = Number(hours) || 0
  if (n === 0) return '0h'
  if (Number.isInteger(n)) return `${n}h`
  return `${n}h`
}

function weekRangeLabel(days) {
  if (!days?.length) return ''
  const start = days[0]
  const end = days[days.length - 1]
  const opts = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString([], opts)
  const endStr = end.toLocaleDateString([], {
    ...opts,
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
  })
  const year =
    start.getFullYear() === end.getFullYear() ? `, ${start.getFullYear()}` : ''
  return `${startStr} – ${endStr}${year}`
}

const subNavClass = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
    isActive
      ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
  }`

export function EmployeeTimelinePage() {
  const { employees, setEmployees } = useTeamStore()

  const [selectedUid, setSelectedUid] = useState('')
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  const weekDays = useMemo(() => getWeekDates(weekAnchor), [weekAnchor])

  useEffect(() => {
    getEmployees().then((emps) => {
      if (emps?.length) setEmployees(emps)
    })
  }, [setEmployees])

  useEffect(() => {
    if (!selectedUid && employees.length > 0) {
      setSelectedUid(employees[0].uid || employees[0].employeeId || '')
    }
  }, [employees, selectedUid])

  useEffect(() => {
    if (!selectedUid) {
      setEntries([])
      return
    }

    const startDate = toDateStr(weekDays[0])
    const endDate = toDateStr(weekDays[weekDays.length - 1])
    let cancelled = false

    setLoading(true)
    fetchEmployeeTimelineEntries(selectedUid, startDate, endDate).then((data) => {
      if (!cancelled) {
        setEntries(data)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [selectedUid, weekDays])

  const shiftWeek = (delta) => {
    const next = new Date(weekAnchor)
    next.setDate(next.getDate() + delta * 7)
    setWeekAnchor(next)
  }

  const entriesByDate = useMemo(() => {
    const map = {}
    for (const day of weekDays) {
      map[toDateStr(day)] = []
    }
    for (const entry of entries) {
      if (!map[entry.date]) map[entry.date] = []
      map[entry.date].push(entry)
    }
    return map
  }, [entries, weekDays])

  const weekTotal = useMemo(
    () => entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0),
    [entries]
  )

  const selectedEmployee = employees.find(
    (e) => (e.uid || e.employeeId) === selectedUid
  )
  const todayStr = toDateStr(new Date())

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          title="Employee Work Timeline"
          description="View what each employee logged for Mon–Sat"
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
          <NavLink to="/team/employees" className={subNavClass}>
            <Users className="w-3.5 h-3.5" /> Employee Directory
          </NavLink>
          <NavLink to="/team/attendance" className={subNavClass}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Attendance Tracker
          </NavLink>
          <NavLink to="/team/leave" className={subNavClass}>
            <Calendar className="w-3.5 h-3.5" /> Leave Management
          </NavLink>
          <NavLink to="/team/holidays" className={subNavClass}>
            <PartyPopper className="w-3.5 h-3.5" /> Public Holidays
          </NavLink>
          <NavLink to="/team/timeline" className={subNavClass}>
            <CalendarDays className="w-3.5 h-3.5" /> Work Timeline
          </NavLink>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedUid}
            onChange={(e) => setSelectedUid(e.target.value)}
            className="bg-slate-100 dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 rounded-xl px-3 py-2 focus:outline-none min-w-[200px]"
          >
            {employees.length === 0 && (
              <option value="">No employees</option>
            )}
            {employees.map((emp) => {
              const id = emp.uid || emp.employeeId
              const name = emp.displayName || emp.name || emp.email || 'Employee'
              return (
                <option key={id} value={id}>
                  {name}
                </option>
              )
            })}
          </select>

          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
          />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {weekRangeLabel(weekDays)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={ChevronRight}
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekAnchor(new Date())}
          >
            This week
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>
            {selectedEmployee
              ? `${selectedEmployee.displayName || selectedEmployee.name}: `
              : ''}
            Week total:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {formatHours(weekTotal)}
            </strong>
          </span>
        </div>
      </div>

      {/* Read-only Mon–Sat grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {weekDays.map((day, idx) => {
          const dateStr = toDateStr(day)
          const dayEntries = entriesByDate[dateStr] || []
          const dayTotal = dayEntries.reduce(
            (sum, e) => sum + (Number(e.hours) || 0),
            0
          )
          const isToday = dateStr === todayStr

          return (
            <Card
              key={dateStr}
              className={`flex flex-col min-h-[220px] p-3 border ${
                isToday
                  ? 'border-indigo-400 dark:border-indigo-500/50 ring-1 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span
                  className={`text-xs font-bold uppercase tracking-wide ${
                    isToday
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {DAY_LABELS[idx]}
                </span>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                  {day.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-48">
                {loading ? (
                  <p className="text-[11px] text-slate-400 py-4 text-center">Loading…</p>
                ) : dayEntries.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-6 text-center">No entries</p>
                ) : (
                  dayEntries.map((entry) => (
                    <div
                      key={entry.entryId}
                      className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 p-2"
                    >
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-4">
                        {entry.description}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {formatHours(entry.hours)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">Day total</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {formatHours(dayTotal)}
                </span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
