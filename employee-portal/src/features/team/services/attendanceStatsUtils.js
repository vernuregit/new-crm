/**
 * Utility functions to compute real dynamic attendance averages and metrics
 * for individual employees and team-wide.
 */

export function timeStrToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null
  const match = timeStr.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i)
  if (!match) return null
  let hrs = parseInt(match[1], 10)
  const mins = parseInt(match[2], 10)
  const ampm = match[3] ? match[3].toUpperCase() : null

  if (ampm === 'PM' && hrs < 12) hrs += 12
  if (ampm === 'AM' && hrs === 12) hrs = 0
  return hrs * 60 + mins
}

export function minutesToTimeStr(totalMinutes) {
  if (totalMinutes === null || totalMinutes === undefined || isNaN(totalMinutes)) return null
  let hrs = Math.floor(totalMinutes / 60) % 24
  const mins = Math.round(totalMinutes % 60)
  const ampm = hrs >= 12 ? 'PM' : 'AM'
  hrs = hrs % 12
  if (hrs === 0) hrs = 12
  const hrsStr = hrs.toString().padStart(2, '0')
  const minsStr = mins.toString().padStart(2, '0')
  return `${hrsStr}:${minsStr} ${ampm}`
}

export function formatSecondsToHrsMins(totalSec) {
  if (!totalSec || totalSec <= 0) return '0h 0m'
  const hrs = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  return `${hrs}h ${mins}m`
}

/**
 * Computes REAL attendance averages for an employee based on their attendance log records.
 *
 * @param {Array<object>} logs - List of attendance logs from Firestore/store
 * @param {object} [currentLiveState] - Current today live session
 * @returns {object} { avgHours, avgCheckIn, avgArrival, avgCheckOut, totalDays, presentDays }
 */
export function computeRealAttendanceStats(logs = [], currentLiveState = null) {
  const dateMap = {}

  if (Array.isArray(logs)) {
    logs.forEach((log) => {
      if (log && log.date) {
        dateMap[log.date] = log
      }
    })
  } else if (logs && typeof logs === 'object') {
    Object.values(logs).forEach((log) => {
      if (log && log.date) {
        dateMap[log.date] = log
      }
    })
  }

  // Include current live state if available
  if (currentLiveState && currentLiveState.date) {
    const d = currentLiveState.date
    dateMap[d] = {
      ...(dateMap[d] || {}),
      ...currentLiveState,
    }
  }

  const records = Object.values(dateMap)

  if (records.length === 0) {
    const liveClockIn = currentLiveState?.clockInTime || null
    const liveClockOut = currentLiveState?.clockOutTime || null
    const liveWorkedSec = currentLiveState?.accumulatedWorkSeconds || 0

    return {
      totalDays: liveWorkedSec > 0 || liveClockIn ? 1 : 0,
      presentDays: liveWorkedSec > 0 || liveClockIn ? 1 : 0,
      absentDays: 0,
      attendancePercentage: 100,
      avgHours: formatSecondsToHrsMins(liveWorkedSec),
      avgCheckIn: liveClockIn || '—',
      avgArrival: liveClockIn || '—',
      avgCheckOut: liveClockOut || '—',
    }
  }

  // 1. Avg Hours / Day
  let totalWorkedSeconds = 0
  let workedDaysCount = 0
  records.forEach((r) => {
    let sec = Number(r.regularSeconds) || Number(r.accumulatedWorkSeconds) || 0
    if (sec > 28800) sec = 28800 // Cap single-day regular hours at 8 hours (28,800 sec max)
    if (sec > 0) {
      totalWorkedSeconds += sec
      workedDaysCount++
    }
  })

  const avgWorkedSec = workedDaysCount > 0 ? Math.round(totalWorkedSeconds / workedDaysCount) : 0
  const avgHours = formatSecondsToHrsMins(avgWorkedSec)

  // 2. Avg Check-In & Arrival
  const checkInMinsList = []
  records.forEach((r) => {
    const mins = timeStrToMinutes(r.clockInTime)
    if (mins !== null) checkInMinsList.push(mins)
  })

  const avgCheckInMins = checkInMinsList.length > 0
    ? checkInMinsList.reduce((a, b) => a + b, 0) / checkInMinsList.length
    : null
  const avgCheckIn = minutesToTimeStr(avgCheckInMins) || currentLiveState?.clockInTime || '—'

  // Earliest or average arrival time
  const minCheckInMins = checkInMinsList.length > 0 ? Math.min(...checkInMinsList) : null
  const avgArrival = minutesToTimeStr(minCheckInMins) || avgCheckIn

  // 3. Avg Check-Out
  const checkOutMinsList = []
  records.forEach((r) => {
    const mins = timeStrToMinutes(r.clockOutTime)
    if (mins !== null) checkOutMinsList.push(mins)
  })

  const avgCheckOutMins = checkOutMinsList.length > 0
    ? checkOutMinsList.reduce((a, b) => a + b, 0) / checkOutMinsList.length
    : null
  const avgCheckOut = minutesToTimeStr(avgCheckOutMins) || currentLiveState?.clockOutTime || '—'

  const presentDays = records.filter(
    (r) =>
      r.clockInTime ||
      (r.regularSeconds && r.regularSeconds > 0) ||
      r.onDuty === true ||
      r.present === true ||
      r.source === 'on_duty'
  ).length

  return {
    totalDays: records.length,
    presentDays,
    absentDays: 0,
    attendancePercentage: 100,
    avgHours,
    avgCheckIn,
    avgArrival,
    avgCheckOut,
  }
}
