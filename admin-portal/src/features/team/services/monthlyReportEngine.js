/**
 * Builds employee-wise, month-wise report snapshots from live attendance,
 * leave, and timeline data.
 */

import {
  computeRealAttendanceStats,
  formatSecondsToHrsMins,
  getCappedRegularSeconds,
  getLateInfo,
  isAttendancePresent,
} from './attendanceStatsUtils'

/**
 * @param {string} month YYYY-MM
 * @returns {{ start: string, end: string }}
 */
export function getMonthDateBounds(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    const now = new Date()
    const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return getMonthDateBounds(m)
  }
  const [y, mo] = month.split('-').map(Number)
  const lastDay = new Date(y, mo, 0).getDate()
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

/**
 * Current calendar month as YYYY-MM (local).
 */
export function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Inclusive list of YYYY-MM-DD dates in a month.
 * @param {string} month
 * @returns {string[]}
 */
export function listDatesInMonth(month) {
  const { start, end } = getMonthDateBounds(month)
  const dates = []
  const cursor = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  while (cursor <= last) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/**
 * Expand inclusive YYYY-MM-DD range into date strings.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {string[]}
 */
export function expandDateRange(startDate, endDate) {
  const dates = []
  if (!startDate) return dates
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${(endDate || startDate)}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates
  const cursor = new Date(start)
  while (cursor <= end) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/**
 * Mon–Fri working days in month, minus company holiday dates.
 * @param {string} month
 * @param {Array<{ date?: string }>} [holidays]
 * @returns {string[]}
 */
export function getWorkingDaysInMonth(month, holidays = []) {
  const holidaySet = new Set(
    (holidays || []).map((h) => h.date).filter((d) => d && d.startsWith(month))
  )
  return listDatesInMonth(month).filter((dateStr) => {
    if (holidaySet.has(dateStr)) return false
    const day = new Date(`${dateStr}T00:00:00`).getDay()
    return day >= 1 && day <= 5
  })
}

/**
 * Match leave request to employee uid.
 * @param {object} leave
 * @param {object} employee
 * @returns {boolean}
 */
export function leaveMatchesEmployee(leave, employee) {
  if (!leave || !employee) return false
  const uid = employee.uid || employee.employeeId || employee.id
  if (leave.employeeId && uid && String(leave.employeeId) === String(uid)) return true
  if (leave.employeeEmail && employee.email) {
    if (leave.employeeEmail.toLowerCase() === employee.email.toLowerCase()) return true
  }
  const name = (employee.displayName || employee.name || '').toLowerCase()
  if (leave.employeeName && name && leave.employeeName.toLowerCase() === name) return true
  return false
}

/**
 * Days of a leave request that fall within the month (calendar days).
 * @param {object} leave
 * @param {string} month
 * @returns {string[]}
 */
export function leaveDatesInMonth(leave, month) {
  const { start, end } = getMonthDateBounds(month)
  return expandDateRange(leave.startDate, leave.endDate || leave.startDate).filter(
    (d) => d >= start && d <= end
  )
}

/**
 * Build one employee monthly report document payload (not yet persisted).
 *
 * @param {object} params
 * @param {object} params.employee
 * @param {string} params.month YYYY-MM
 * @param {Array} params.attendanceLogs
 * @param {Array} params.leaveRequests
 * @param {Array} params.timelineEntries
 * @param {Array} [params.holidays]
 * @param {string} [params.generatedBy]
 * @returns {object}
 */
export function buildEmployeeMonthlyReport({
  employee,
  month,
  attendanceLogs = [],
  leaveRequests = [],
  timelineEntries = [],
  holidays = [],
  generatedBy = 'Admin',
}) {
  const uid = employee?.uid || employee?.employeeId || employee?.id || ''
  const { start, end } = getMonthDateBounds(month)
  const workingDaysList = getWorkingDaysInMonth(month, holidays)
  const workingDays = workingDaysList.length

  const logsByDate = {}
  ;(attendanceLogs || []).forEach((log) => {
    if (!log?.date) return
    if (log.date < start || log.date > end) return
    if (log.uid && uid && String(log.uid) !== String(uid)) return
    logsByDate[log.date] = log
  })

  const empLeaves = (leaveRequests || []).filter((l) => leaveMatchesEmployee(l, employee))
  const leaveByDate = {}
  empLeaves.forEach((leave) => {
    leaveDatesInMonth(leave, month).forEach((d) => {
      if (!leaveByDate[d]) leaveByDate[d] = []
      leaveByDate[d].push(leave)
    })
  })

  const timelineByDate = {}
  let timelineWorkHours = 0
  let timelineUpskillHours = 0
  let timelineEntryCount = 0
  ;(timelineEntries || []).forEach((entry) => {
    if (!entry?.date || entry.date < start || entry.date > end) return
    if (entry.uid && uid && String(entry.uid) !== String(uid)) return
    const hrs = Number(entry.hours) || 0
    timelineEntryCount += 1
    if (entry.entryType === 'upskilling') timelineUpskillHours += hrs
    else timelineWorkHours += hrs
    if (!timelineByDate[entry.date]) timelineByDate[entry.date] = 0
    timelineByDate[entry.date] += hrs
  })

  let presentDays = 0
  let absentDays = 0
  let onDutyDays = 0
  let lateDays = 0
  let onTimeDays = 0
  let totalRegularSeconds = 0
  let totalExtraSeconds = 0

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const daily = workingDaysList.map((date) => {
    const log = logsByDate[date]
    const present = isAttendancePresent(log)
    const onDuty = Boolean(log?.onDuty || log?.source === 'on_duty')
    const clockInTime = log?.clockInTime && log.clockInTime !== '—' ? log.clockInTime : null
    const clockOutTime =
      log?.clockOutTime && log.clockOutTime !== '—' && log.clockOutTime !== 'In office'
        ? log.clockOutTime
        : log?.clockOutTime === 'In office'
          ? 'In office'
          : null
    const { isLate, lateMinutes } = present && clockInTime
      ? getLateInfo(clockInTime)
      : { isLate: false, lateMinutes: 0 }
    const regularSeconds = getCappedRegularSeconds(log)
    const extraSeconds = Number(log?.extraSeconds) || Number(log?.accumulatedExtraSeconds) || 0

    const dayLeaves = leaveByDate[date] || []
    const approvedLeave = dayLeaves.find((l) => l.status === 'approved')
    const leaveType = approvedLeave?.leaveType || (dayLeaves[0]?.leaveType ?? null)

    // Only count absence for past/today working days without present mark and without approved leave
    const isFuture = date > todayStr
    if (present) {
      presentDays += 1
      if (onDuty) onDutyDays += 1
      if (isLate) lateDays += 1
      else if (clockInTime) onTimeDays += 1
      totalRegularSeconds += regularSeconds
      totalExtraSeconds += extraSeconds
    } else if (!isFuture && !approvedLeave) {
      absentDays += 1
    }

    return {
      date,
      present,
      late: isLate,
      lateMinutes,
      clockInTime: clockInTime || null,
      clockOutTime: clockOutTime || null,
      regularSeconds,
      extraSeconds,
      leaveType,
      timelineHours: timelineByDate[date] || 0,
      onDuty,
    }
  })

  const monthLogs = Object.values(logsByDate)
  const avgStats = computeRealAttendanceStats(monthLogs)
  const attendancePercentage =
    workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0

  let approvedDays = 0
  let pendingDays = 0
  const byType = {}
  const requestSummaries = []

  empLeaves.forEach((leave) => {
    const daysInMonth = leaveDatesInMonth(leave, month)
    if (daysInMonth.length === 0) return
    const count = daysInMonth.length
    const type = leave.leaveType || 'Leave'
    if (leave.status === 'approved') {
      approvedDays += count
      byType[type] = (byType[type] || 0) + count
    } else if (leave.status === 'pending') {
      pendingDays += count
    }
    requestSummaries.push({
      leaveId: leave.leaveId || leave.id || null,
      leaveType: type,
      startDate: leave.startDate || null,
      endDate: leave.endDate || leave.startDate || null,
      days: count,
      status: leave.status || 'pending',
    })
  })

  const isCurrentMonth = month === currentMonthStr()

  return {
    uid,
    employeeId: uid,
    displayName: employee?.displayName || employee?.name || 'Employee',
    departmentName: employee?.departmentName || employee?.department || '',
    roleName: employee?.roleName || employee?.role || '',
    month,
    generatedAt: new Date().toISOString(),
    generatedBy,
    status: isCurrentMonth ? 'draft' : 'final',
    attendance: {
      workingDays,
      presentDays,
      absentDays,
      onDutyDays,
      lateDays,
      onTimeDays,
      totalRegularSeconds,
      totalExtraSeconds,
      avgHours: avgStats.avgHours || formatSecondsToHrsMins(0),
      avgCheckIn: avgStats.avgCheckIn || '—',
      avgCheckOut: avgStats.avgCheckOut || '—',
      attendancePercentage,
      totalRegularHoursLabel: formatSecondsToHrsMins(totalRegularSeconds),
      totalExtraHoursLabel: formatSecondsToHrsMins(totalExtraSeconds),
    },
    leave: {
      approvedDays,
      pendingDays,
      byType,
      requests: requestSummaries,
    },
    timeline: {
      totalHours: Math.round((timelineWorkHours + timelineUpskillHours) * 100) / 100,
      workHours: Math.round(timelineWorkHours * 100) / 100,
      upskillingHours: Math.round(timelineUpskillHours * 100) / 100,
      entryCount: timelineEntryCount,
    },
    daily,
  }
}

/**
 * Doc id for employeeMonthlyReports collection.
 * @param {string} uid
 * @param {string} month
 */
export function monthlyReportDocId(uid, month) {
  return `${uid}_${month}`
}

/**
 * Convert a report to CSV string (summary + daily rows).
 * @param {object} report
 * @returns {string}
 */
export function monthlyReportToCsv(report) {
  if (!report) return ''
  const lines = []
  lines.push('Employee Monthly Report')
  lines.push(`Employee,${csvEscape(report.displayName)}`)
  lines.push(`Department,${csvEscape(report.departmentName)}`)
  lines.push(`Month,${report.month}`)
  lines.push(`Generated At,${report.generatedAt || ''}`)
  lines.push('')
  lines.push('Metric,Value')
  const a = report.attendance || {}
  lines.push(`Working Days,${a.workingDays ?? ''}`)
  lines.push(`Present Days,${a.presentDays ?? ''}`)
  lines.push(`Absent Days,${a.absentDays ?? ''}`)
  lines.push(`Late Days,${a.lateDays ?? ''}`)
  lines.push(`On Duty Days,${a.onDutyDays ?? ''}`)
  lines.push(`Attendance %,${a.attendancePercentage ?? ''}`)
  lines.push(`Avg Hours,${csvEscape(a.avgHours)}`)
  lines.push(`Avg Check-In,${csvEscape(a.avgCheckIn)}`)
  lines.push(`Avg Check-Out,${csvEscape(a.avgCheckOut)}`)
  lines.push(`Total Regular Hours,${csvEscape(a.totalRegularHoursLabel)}`)
  lines.push(`Total Extra Hours,${csvEscape(a.totalExtraHoursLabel)}`)
  lines.push(`Leave Approved Days,${report.leave?.approvedDays ?? ''}`)
  lines.push(`Leave Pending Days,${report.leave?.pendingDays ?? ''}`)
  lines.push(`Timeline Hours,${report.timeline?.totalHours ?? ''}`)
  lines.push('')
  lines.push(
    'Date,Present,Late,Late Minutes,Clock In,Clock Out,Regular Seconds,Extra Seconds,Leave Type,Timeline Hours'
  )
  ;(report.daily || []).forEach((row) => {
    lines.push(
      [
        row.date,
        row.present ? 'Yes' : 'No',
        row.late ? 'Yes' : 'No',
        row.lateMinutes ?? 0,
        csvEscape(row.clockInTime || ''),
        csvEscape(row.clockOutTime || ''),
        row.regularSeconds ?? 0,
        row.extraSeconds ?? 0,
        csvEscape(row.leaveType || ''),
        row.timelineHours ?? 0,
      ].join(',')
    )
  })
  return lines.join('\n')
}

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
