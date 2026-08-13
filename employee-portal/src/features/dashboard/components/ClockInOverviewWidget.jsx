import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { useTeamStore } from '../../team/stores/teamStore'
import { useUserStore } from '../../../stores/userStore'
import { getEmployees } from '../../team/services/teamService'
import { prepareClockInGate, LOCATION_GATE_ENABLED } from '../../team/services/wfhAttendanceUtils'
import { formatTo12HourTime } from '../../team/services/attendanceStatsUtils'
import { AttendanceCalendarWidget } from './AttendanceCalendarWidget'
import { AttendanceMetricsBar } from '../../team/components/AttendanceMetricsBar'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../../shared/services/firebaseService'
import {
  Clock,
  LogIn,
  LogOut,
  TrendingUp,
  Coffee,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ListFilter,
  History,
  AlertCircle,
  Zap,
  Loader2,
  MapPin,
} from 'lucide-react'

export const ClockInOverviewWidget = () => {
  const { user, userDoc } = useUserStore()
  const activeUid = userDoc?.uid || user?.uid
  const displayName = userDoc?.displayName || user?.displayName || 'Employee'
  const departmentName = userDoc?.departmentName || ''

  const {
    employees,
    setEmployees,
    leaveRequests,
    setLeaveRequests,
    clockedIn,
    clockInTime,
    clockInTimestamp,
    clockOutTime,
    isOnBreak,
    breakStartTime,
    accumulatedBreakSeconds,
    accumulatedWorkSeconds,
    todayShiftLogs,
    attendanceStats,
    isInExtraTime,
    extraTimeStart,
    accumulatedExtraSeconds,
    loadUserAttendance,
    toggleClockIn,
    toggleBreak,
    toggleExtraTime,
  } = useTeamStore()

  const [currentTimeStr, setCurrentTimeStr] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [elapsedExtraSec, setElapsedExtraSec] = useState(0)
  const [showLogs, setShowLogs] = useState(false)
  const [clockBusy, setClockBusy] = useState(false)
  const [clockError, setClockError] = useState('')
  const [clockHint, setClockHint] = useState('')

  // Fetch today's attendance log for the active logged-in employee
  useEffect(() => {
    if (activeUid) {
      loadUserAttendance(activeUid)
    }
  }, [activeUid, loadUserAttendance])

  useEffect(() => {
    getEmployees().then((list) => {
      if (list?.length) setEmployees(list)
    })
  }, [setEmployees])

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => {
        setLeaveRequests(snap.docs.map((d) => ({ ...d.data(), leaveId: d.id })))
      },
      (err) => console.error('Error listening to leave requests:', err)
    )
    return () => unsub()
  }, [setLeaveRequests])

  const currentEmp =
    employees.find(
      (e) =>
        (activeUid && (e.uid === activeUid || e.employeeId === activeUid)) ||
        (user?.email && e.email?.toLowerCase() === user.email.toLowerCase())
    ) || userDoc || {}

  const handleClockToggle = async () => {
    setClockError('')
    setClockHint('')
    const meta = { uid: activeUid, displayName, departmentName }

    if (clockedIn) {
      toggleClockIn(meta)
      return
    }

    setClockBusy(true)
    try {
      const gate = await prepareClockInGate({
        emp: currentEmp,
        leaveRequests,
        employeeFilter: {
          employeeId: activeUid,
          uid: activeUid,
          employeeEmail: user?.email || userDoc?.email || currentEmp?.email,
          employeeName: displayName,
        },
      })

      if (!gate.ok) {
        setClockError(gate.error || 'Unable to clock in.')
        return
      }

      if (LOCATION_GATE_ENABLED && gate.wfhExempt) {
        setClockHint(gate.reason || 'WFH — location not required')
      }

      const result = toggleClockIn(meta, {
        requireOfficeLocation: gate.requireOfficeLocation,
        locationVerified: gate.locationVerified,
        wfhExempt: gate.wfhExempt,
        coords: gate.coords,
      })

      if (result && result.success === false) {
        setClockError(result.error || 'Unable to clock in.')
      }
    } catch (err) {
      console.error('Clock-in gate error:', err)
      setClockError('Unable to verify location. Try again.')
    } finally {
      setClockBusy(false)
    }
  }

  // Live real-time ticker for extra work hours
  useEffect(() => {
    let timer
    if (isInExtraTime && extraTimeStart) {
      const updateExtraTicker = () => {
        const netExtra = Math.max(0, Math.floor((Date.now() - extraTimeStart) / 1000))
        setElapsedExtraSec(accumulatedExtraSeconds + netExtra)
      }
      updateExtraTicker()
      timer = setInterval(updateExtraTicker, 1000)
    } else {
      setElapsedExtraSec(accumulatedExtraSeconds)
    }
    return () => clearInterval(timer)
  }, [isInExtraTime, extraTimeStart, accumulatedExtraSeconds])

  // Extra work hours unlock after regular 8-hour workday (or already in overtime)
  const isWorkDone =
    elapsedSeconds >= 8 * 3600 ||
    (!clockedIn && accumulatedWorkSeconds > 0) ||
    isInExtraTime



  // Live real-time clock & elapsed work time ticker
  useEffect(() => {
    const updateTicker = () => {
      const now = new Date()
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      )

      if (clockedIn) {
        const nowMs = Date.now()
        let currentSessionSec = 0

        // Session length must use this session's timestamp (not day's first clockInTime)
        if (clockInTimestamp) {
          currentSessionSec = Math.max(0, Math.floor((nowMs - clockInTimestamp) / 1000))
        }

        // Subtract break duration
        let activeBreakSec = accumulatedBreakSeconds || 0
        if (isOnBreak && breakStartTime) {
          activeBreakSec += Math.floor((nowMs - breakStartTime) / 1000)
        }

        const netSec = Math.max(0, currentSessionSec - activeBreakSec)
        // Prior completed sessions today + current open session
        const calculatedTotal = (accumulatedWorkSeconds || 0) + netSec
        setElapsedSeconds(calculatedTotal)
      } else {
        setElapsedSeconds(accumulatedWorkSeconds || 0)
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

  // Format seconds to "Xh Ym" or "0h 0m"
  const formatWorkdayHours = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  // Calculate target progress % based on 8-hour workday (28,800 sec)
  const targetWorkdaySec = 8 * 3600
  const progressPercentage = Math.min(100, Math.round((elapsedSeconds / targetWorkdaySec) * 100))

  // SVG Gauge dimensions
  const gaugeRadius = 38
  const gaugeCircumference = 2 * Math.PI * gaugeRadius
  const strokeDashoffset = gaugeCircumference - (progressPercentage / 100) * gaugeCircumference

  return (
    <div className="space-y-3">
      {/* 5-Card Attendance Metrics Bar: Status, Clock In, Clock Out, Worked Hours, Late By */}
      <AttendanceMetricsBar />

      {/* Main Top Attendance Hub Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">

        {/* CARD 1: Today's Overview (Main Clock-In Card) */}
        <Card className="lg:col-span-5 p-5 sm:p-6 border-slate-200 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/20 dark:from-[#181C27] dark:via-[#181C27] dark:to-emerald-950/20 shadow-lg shadow-slate-200/50 dark:shadow-none">
          {/* Top Row: Title & Badge & Live Clock */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base tracking-tight">
                  Today's Overview
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-xs font-medium">
                  {currentTimeStr}
                </span>

                {clockedIn ? (
                  isOnBreak ? (
                    <Badge variant="warning" className="animate-pulse text-xs px-2.5 py-0.5 font-semibold">
                      On Break
                    </Badge>
                  ) : (
                    <Badge variant="success" className="flex items-center gap-1.5 text-xs px-2.5 py-0.5 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Present
                    </Badge>
                  )
                ) : (
                  <Badge variant="danger" className="text-xs px-2.5 py-0.5 font-semibold">Absent</Badge>
                )}
              </div>
            </div>

            {/* Gauge & Progress Details */}
            <div className="grid grid-cols-12 gap-4 items-center py-4">
              {/* Circular Gauge */}
              <div className="col-span-5 sm:col-span-4 flex flex-col items-center justify-center relative">
                <div className="relative w-28 h-28 sm:w-30 sm:h-30 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    {/* Background Ring */}
                    <circle
                      cx="50"
                      cy="50"
                      r={gaugeRadius}
                      className="text-slate-200 dark:text-slate-800 stroke-current"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    {/* Progress Arc */}
                    <circle
                      cx="50"
                      cy="50"
                      r={gaugeRadius}
                      className="text-emerald-600 dark:text-emerald-500 stroke-current transition-all duration-700 ease-out"
                      strokeWidth="9"
                      strokeDasharray={gaugeCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none tracking-tight">
                      {progressPercentage}%
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                      in office
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress Text Information */}
              <div className="col-span-7 sm:col-span-8 space-y-2 pl-2">
                <div>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Workday Progress
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                    {formatWorkdayHours(elapsedSeconds)}
                  </div>
                </div>

                {/* Sub progress line */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 dark:bg-emerald-400 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium pt-0.5">
                  {!clockedIn ? (
                    <span className="text-slate-500 dark:text-slate-400 italic">
                      You haven't clocked in today
                    </span>
                  ) : isOnBreak ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Paused for break
                    </span>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-300">
                      Clocked in at <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatTo12HourTime(clockInTime)}</strong>
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button Strip */}
          <div className="pt-3 space-y-2">
            {clockError && (
              <div className="flex items-start gap-2 text-xs text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{clockError}</span>
              </div>
            )}
            {clockHint && !clockError && (
              <div className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{clockHint}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
            <Button
              onClick={handleClockToggle}
              disabled={clockBusy}
              className={`flex-1 justify-center py-2.5 font-extrabold shadow-md transition-all text-sm sm:text-base rounded-xl ${
                clockedIn
                  ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white shadow-rose-500/20'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
              }`}
            >
              {clockBusy ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" /> {LOCATION_GATE_ENABLED ? 'Checking location…' : 'Working…'}
                </>
              ) : clockedIn ? (
                <>
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Clock Out
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Check In
                </>
              )}
            </Button>

            {clockedIn && (
              <Button
                variant={isOnBreak ? 'primary' : 'secondary'}
                onClick={() => toggleBreak({ uid: activeUid, displayName, departmentName })}
                title={isOnBreak ? 'Resume Work' : 'Take Break'}
                className="py-2.5 px-3.5 rounded-xl"
              >
                <Coffee className={`w-4 h-4 sm:w-5 sm:h-5 ${isOnBreak ? 'text-white' : 'text-amber-500'}`} />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setShowLogs(!showLogs)}
              title="Today's Shift Logs"
              className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400 rounded-xl"
            >
              <History className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            </div>
          </div>

          {/* Extra Work Hours / Overtime — kept for later; UI hidden for now */}
          {false && (
            <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${isInExtraTime ? 'bg-amber-500/20 text-amber-500 animate-pulse' : isWorkDone ? 'bg-indigo-500/10 text-indigo-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Extra Work Hours
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {isInExtraTime
                      ? `Logging overtime: ${formatWorkdayHours(elapsedExtraSec)}`
                      : isWorkDone
                      ? `Unlocked! Shift completed (${formatWorkdayHours(accumulatedExtraSeconds)} logged)`
                      : ''}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant={isInExtraTime ? 'danger' : isWorkDone ? 'primary' : 'secondary'}
                disabled={!isWorkDone && !isInExtraTime}
                onClick={() => toggleExtraTime({ uid: activeUid, displayName, departmentName })}
                title={!isWorkDone ? 'Finish regular workday to unlock extra work hours' : 'Toggle extra work hours logging'}
                className="text-xs font-bold px-3 py-1.5 rounded-xl shrink-0"
              >
                {isInExtraTime ? 'Stop Extra Time' : 'Start Extra Time'}
              </Button>
            </div>
          )}
        </Card>

        {/* CARD 2: Daily Metrics 2x2 Grid */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3 items-stretch">
          {/* Avg Hours / Day */}
          <Card className="p-3 border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-indigo-400/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {attendanceStats?.avgHours || formatWorkdayHours(elapsedSeconds)}
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-0.5">
                Avg hours / day
              </span>
            </div>
          </Card>

          {/* Avg Check-In */}
          <Card className="p-3 border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-emerald-400/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
              <LogIn className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {attendanceStats?.avgCheckIn || clockInTime || '—'}
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-0.5">
                Avg check-in
              </span>
            </div>
          </Card>

          {/* Avg Arrival Time */}
          <Card className="p-3 border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-teal-400/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {attendanceStats?.avgArrival || clockInTime || '—'}
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-0.5">
                Avg arrival time
              </span>
            </div>
          </Card>

          {/* Avg Check-Out */}
          <Card className="p-3 border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-purple-400/40 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                {attendanceStats?.avgCheckOut || clockOutTime || '—'}
              </div>
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block mt-0.5">
                Avg check-out
              </span>
            </div>
          </Card>
        </div>

        {/* CARD 3: Attendance Calendar (compact height so it matches other cards) */}
        <div className="lg:col-span-3 flex w-full">
          <AttendanceCalendarWidget />
        </div>
      </div>

      {/* Shift History Log Dropdown Panel */}
      {showLogs && (
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 transition-all animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
              <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Today's Shift Activity Log</span>
            </div>
            <span className="text-[10px] text-slate-500">
              {todayShiftLogs.length} events logged today
            </span>
          </div>

          {todayShiftLogs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic text-center py-3">
              No clock events recorded for today yet. Click "Check In" to log your shift arrival.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {todayShiftLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#181C27] border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.type === 'clock_in'
                          ? 'bg-emerald-500'
                          : log.type === 'clock_out'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {log.label}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {formatTo12HourTime(log.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}