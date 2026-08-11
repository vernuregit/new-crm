import React, { useState, useEffect } from 'react'
import { Card } from '../../../components/ui/Card'
import { useTeamStore, OFFICE_START_HOUR, OFFICE_START_MINUTE } from '../stores/teamStore'
import { UserCheck, LogIn, LogOut, Timer, AlertCircle } from 'lucide-react'

export const AttendanceMetricsBar = () => {
  const {
    clockedIn,
    clockInTime,
    clockInTimestamp,
    clockOutTime,
    isOnBreak,
    breakStartTime,
    accumulatedBreakSeconds,
    accumulatedWorkSeconds,
  } = useTeamStore()

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Live timer for Worked Hours ticker
  useEffect(() => {
    const updateTicker = () => {
      if (clockedIn && clockInTimestamp) {
        const nowMs = Date.now()
        let currentSessionSec = Math.floor((nowMs - clockInTimestamp) / 1000)
        let activeBreakSec = accumulatedBreakSeconds
        if (isOnBreak && breakStartTime) {
          activeBreakSec += Math.floor((nowMs - breakStartTime) / 1000)
        }
        const netSec = Math.max(0, currentSessionSec - activeBreakSec)
        setElapsedSeconds(accumulatedWorkSeconds + netSec)
      } else {
        setElapsedSeconds(accumulatedWorkSeconds)
      }
    }
    updateTicker()
    const timer = setInterval(updateTicker, 1000)
    return () => clearInterval(timer)
  }, [
    clockedIn,
    clockInTimestamp,
    isOnBreak,
    breakStartTime,
    accumulatedBreakSeconds,
    accumulatedWorkSeconds,
  ])

  const formatHoursStr = (totalSec) => {
    if (!totalSec || totalSec <= 0) return '0h 0m'
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  // Late By vs 10:30 AM — use day's first clock-in time (not latest session timestamp)
  const getLateByInfo = () => {
    if (!clockInTime && !clockInTimestamp) {
      return { text: 'On time', isLate: false }
    }

    let clockInDate = null

    // Prefer displayed first-of-day clockInTime so re-clock-ins don't inflate lateness
    if (clockInTime) {
      const match = clockInTime.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i)
      if (match) {
        let hrs = parseInt(match[1], 10)
        const mins = parseInt(match[2], 10)
        const ampm = match[3] ? match[3].toUpperCase() : null
        if (ampm === 'PM' && hrs < 12) hrs += 12
        if (ampm === 'AM' && hrs === 12) hrs = 0
        // 24h locale strings without AM/PM (e.g. "10:28")
        if (!ampm && hrs <= 23) {
          // keep hrs as-is
        }
        clockInDate = new Date()
        clockInDate.setHours(hrs, mins, 0, 0)
      }
    }

    if (!clockInDate && clockInTimestamp) {
      clockInDate = new Date(clockInTimestamp)
    }

    if (!clockInDate) return { text: 'On time', isLate: false }

    const targetDate = new Date(clockInDate)
    targetDate.setHours(OFFICE_START_HOUR, OFFICE_START_MINUTE, 0, 0)

    const diffMs = clockInDate.getTime() - targetDate.getTime()
    if (diffMs <= 0) {
      return { text: 'On time', isLate: false }
    }

    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins <= 0) return { text: 'On time', isLate: false }

    const h = Math.floor(diffMins / 60)
    const m = diffMins % 60
    const lateStr = h > 0 ? `${h}h ${m}m late` : `${m}m late`
    return { text: lateStr, isLate: true }
  }

  const lateInfo = getLateByInfo()

  // Status computation
  let statusText = 'Absent'
  let statusColor = 'text-rose-600 dark:text-rose-400'
  let statusBg = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20'

  if (clockedIn) {
    if (isOnBreak) {
      statusText = 'On Break'
      statusColor = 'text-amber-600 dark:text-amber-400'
    } else {
      statusText = 'Present'
      statusColor = 'text-emerald-600 dark:text-emerald-400'
    }
  } else if (accumulatedWorkSeconds > 0 || clockOutTime) {
    statusText = 'Off Duty'
    statusColor = 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Status Card */}
      <Card className="p-4 bg-white dark:bg-[#181C27] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${statusBg} flex items-center justify-center shrink-0`}>
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Status</span>
            <span className={`text-base font-extrabold ${statusColor} block mt-0.5`}>
              {statusText}
            </span>
          </div>
        </div>
      </Card>

      {/* 2. Clock In Card */}
      <Card className="p-4 bg-white dark:bg-[#181C27] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 flex items-center justify-center shrink-0">
            <LogIn className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Clock In</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
              {clockInTime || '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* 3. Clock Out Card */}
      <Card className="p-4 bg-white dark:bg-[#181C27] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Clock Out</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-0.5">
              {clockOutTime || '—'}
            </span>
          </div>
        </div>
      </Card>

      {/* 4. Worked Hours Card */}
      <Card className="p-4 bg-white dark:bg-[#181C27] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 flex items-center justify-center shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Worked Hours</span>
            <span className="text-base font-extrabold text-teal-600 dark:text-teal-400 block mt-0.5">
              {formatHoursStr(elapsedSeconds)}
            </span>
          </div>
        </div>
      </Card>

      {/* 5. Late By Card */}
      <Card className="p-4 bg-white dark:bg-[#181C27] border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">Late By</span>
            <span className={`text-base font-extrabold block mt-0.5 ${lateInfo.isLate ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {lateInfo.text}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
