import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import {
  getAttendanceLogsForMonth,
  subscribeToCompanyHolidays,
} from '../services/teamService'
import { expandDateRange } from '../services/monthlyReportEngine'
import { isAttendancePresent } from '../services/attendanceStatsUtils'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const LOP_LEAVE_TYPE = 'LOP (Loss of Pay)'
/** Approved leave types that mark attendance Present (not absent/LOP overlays). */
const PRESENT_LEAVE_TYPES = new Set(['On Duty', 'Work From Home'])

const leaveMatchesEmployee = (l, employeeUid, employeeEmail, employeeName) =>
  Boolean(
    (employeeUid && (l.employeeId === employeeUid || l.uid === employeeUid)) ||
      (employeeEmail && l.employeeEmail?.toLowerCase() === employeeEmail.toLowerCase()) ||
      (employeeName && l.employeeName?.toLowerCase() === employeeName.toLowerCase())
  )

/**
 * Admin attendance calendar for one employee/month.
 * Shows Present / Absent / Holiday / LOP (violet) / approved leave (red).
 * Leave overlays always reflect live Admin-approved leaveRequests (deletes clear immediately).
 */
export function EmployeeAttendanceCalendar({
  employeeUid,
  employeeEmail = '',
  employeeName = '',
  month,
  accountStartDate = null,
}) {
  const [viewMonth, setViewMonth] = useState(month)
  const [logsByDate, setLogsByDate] = useState({})
  const [leaveRequests, setLeaveRequests] = useState([])
  const [companyHolidays, setCompanyHolidays] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (month) setViewMonth(month)
  }, [month])

  useEffect(() => {
    const unsub = subscribeToCompanyHolidays((list) => {
      const map = {}
      list.forEach((h) => {
        if (h.date) map[h.date] = h
      })
      setCompanyHolidays(map)
    })
    return () => unsub()
  }, [])

  // Live leaveRequests so deleted/revoked approvals clear from the calendar immediately
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => {
        setLeaveRequests(snap.docs.map((d) => ({ ...d.data(), leaveId: d.id })))
      },
      (err) => console.error('Error listening to leave requests:', err)
    )
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!employeeUid || !viewMonth) {
      setLogsByDate({})
      return
    }

    let cancelled = false
    setLoading(true)

    getAttendanceLogsForMonth(viewMonth)
      .then((logs) => {
        if (cancelled) return
        const map = {}
        ;(logs || []).forEach((log) => {
          if (!log?.date) return
          if (log.uid !== employeeUid && log.employeeId !== employeeUid) return
          map[log.date] = log
        })
        setLogsByDate(map)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [employeeUid, viewMonth])

  /** date → { kind: 'lop' | 'leave', leaveType } from currently approved leave only */
  const approvedLeaveByDate = useMemo(() => {
    const map = {}
    if (!employeeUid && !employeeEmail && !employeeName) return map
    leaveRequests.forEach((l) => {
      if (l.status !== 'approved') return
      if (!leaveMatchesEmployee(l, employeeUid, employeeEmail, employeeName)) return
      const type = l.leaveType || 'Leave'
      if (PRESENT_LEAVE_TYPES.has(type)) return
      const kind = type === LOP_LEAVE_TYPE ? 'lop' : 'leave'
      expandDateRange(l.startDate, l.endDate || l.startDate).forEach((d) => {
        if (viewMonth && !d.startsWith(viewMonth)) return
        if (map[d]?.kind === 'lop') return
        map[d] = { kind, leaveType: type }
      })
    })
    return map
  }, [leaveRequests, employeeUid, employeeEmail, employeeName, viewMonth])

  const [year, monthIndex] = useMemo(() => {
    if (!viewMonth || !/^\d{4}-\d{2}$/.test(viewMonth)) {
      const now = new Date()
      return [now.getFullYear(), now.getMonth()]
    }
    const [y, m] = viewMonth.split('-').map(Number)
    return [y, m - 1]
  }, [viewMonth])

  const monthName = useMemo(
    () =>
      new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [year, monthIndex]
  )

  const handlePrevMonth = () => {
    const d = new Date(year, monthIndex - 1, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const handleNextMonth = () => {
    const d = new Date(year, monthIndex + 1, 1)
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate()

  const gridCells = []
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    gridCells.push({ day: dayNum, isCurrentMonth: false, key: `prev-${dayNum}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({ day: d, isCurrentMonth: true, key: `curr-${d}` })
  }
  const totalSlotsNeeded = gridCells.length > 35 ? 42 : 35
  for (let n = 1; n <= totalSlotsNeeded - gridCells.length; n++) {
    gridCells.push({ day: n, isCurrentMonth: false, key: `next-${n}` })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getStatus = (dayNum, isCurrentMonth) => {
    if (!isCurrentMonth) return null
    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

    const cellDate = new Date(year, monthIndex, dayNum)
    cellDate.setHours(0, 0, 0, 0)
    const isWeekend = cellDate.getDay() === 0
    const isFuture = cellDate > today

    // No attendance markers before the employee account exists
    if (accountStartDate && dateKey < accountStartDate) return null

    if (companyHolidays[dateKey]) return 'holiday'

    const approvedLeave = approvedLeaveByDate[dateKey]
    if (approvedLeave?.kind === 'lop') return 'lop'
    if (approvedLeave?.kind === 'leave') return 'leave'

    // Future days: never show Absent
    if (isFuture) return null

    const log = logsByDate[dateKey]
    if (log && isAttendancePresent(log)) return 'present'

    if (isWeekend) return null
    if (loading) return null

    // Without a known join date, don't invent Absent for historical months
    // (avoids painting entire past months red when createdAt is missing)
    if (!accountStartDate) {
      const isCurrentMonthView =
        year === today.getFullYear() && monthIndex === today.getMonth()
      if (!isCurrentMonthView) return null
    }

    return 'absent'
  }

  const weekHeader = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const is6Rows = totalSlotsNeeded > 35

  return (
    <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27] select-none">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800/80">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm tracking-tight">
          Attendance Calendar
        </h4>
        {loading && (
          <span className="text-[10px] text-slate-400">Loading…</span>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 py-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors"
          title="Previous Month"
        >
          <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
        <span className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-tight min-w-[100px] text-center">
          {monthName}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors"
          title="Next Month"
        >
          <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-1 text-center">
        {weekHeader.map((d) => (
          <span
            key={d}
            className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider"
          >
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 gap-x-0.5 items-center justify-items-center">
        {gridCells.map((cell) => {
          const status = getStatus(cell.day, cell.isCurrentMonth)
          const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
          const leaveOverlay = approvedLeaveByDate[dateKey]

          return (
            <div
              key={cell.key}
              className="flex flex-col items-center justify-center w-full rounded"
            >
              <div
                className={`rounded-full flex items-center justify-center font-semibold leading-none ${
                  is6Rows ? 'w-4.5 h-4.5 text-[10px]' : 'w-5 h-5 text-[11px]'
                } ${
                  cell.isCurrentMonth
                    ? status === 'holiday'
                      ? 'bg-amber-400/15 text-amber-600 dark:text-amber-400 font-bold'
                      : status === 'lop'
                      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold'
                      : status === 'leave'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-slate-800 dark:text-slate-200'
                    : 'text-slate-300 dark:text-slate-600 font-normal'
                }`}
              >
                {cell.day}
              </div>
              <div className="h-1.5 flex items-center justify-center mt-0.5 relative group/dot">
                {cell.isCurrentMonth && status && (
                  <>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        status === 'present'
                          ? 'bg-emerald-500'
                          : status === 'holiday'
                          ? 'bg-amber-400'
                          : status === 'lop'
                          ? 'bg-violet-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    {status === 'holiday' && companyHolidays[dateKey]?.name && (
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 hidden group-hover/dot:block pointer-events-none">
                        <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[8px] font-semibold rounded-lg px-2 py-1 whitespace-nowrap shadow-xl">
                          {companyHolidays[dateKey].name}
                        </div>
                      </div>
                    )}
                    {status === 'lop' && (
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 hidden group-hover/dot:block pointer-events-none">
                        <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[8px] font-semibold rounded-lg px-2 py-1 whitespace-nowrap shadow-xl">
                          LOP (Loss of Pay)
                        </div>
                      </div>
                    )}
                    {status === 'leave' && leaveOverlay?.leaveType && (
                      <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 hidden group-hover/dot:block pointer-events-none">
                        <div className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[8px] font-semibold rounded-lg px-2 py-1 whitespace-nowrap shadow-xl">
                          {leaveOverlay.leaveType}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-3 text-[10px] font-medium text-slate-600 dark:text-slate-400 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          <span>LOP</span>
        </div>
      </div>
    </Card>
  )
}
