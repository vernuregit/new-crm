import React, { useState, useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useTeamStore } from './stores/teamStore'
import { db } from '../../shared/services/firebaseService'
import { computeRealAttendanceStats, timeStrToMinutes } from './services/attendanceStatsUtils'
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore'
import {
  Users,
  CheckCircle2,
  Calendar,
  Clock,
  LogIn,
  LogOut,
  Zap,
  Coffee,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  TrendingUp,
  Edit,
  Save,
  X,
} from 'lucide-react'

// Today's date in YYYY-MM-DD
function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function secToHrsStr(totalSec) {
  if (!totalSec || totalSec <= 0) return '0h 0m'
  const hrs = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  return `${hrs}h ${mins}m`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export const AttendancePage = () => {
  const { employees } = useTeamStore()

  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [isLive, setIsLive] = useState(false)
  const [allLogs, setAllLogs] = useState([])

  // Admin edit attendance log state
  const [editingRow, setEditingRow] = useState(null)
  const [editClockIn, setEditClockIn] = useState('')
  const [editClockOut, setEditClockOut] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingRow) return
    setSavingEdit(true)
    try {
      const docId = `${selectedDate}_${editingRow.uid}`
      const inMins = timeStrToMinutes(editClockIn)
      const outMins = editClockOut && editClockOut !== 'In office' ? timeStrToMinutes(editClockOut) : null

      let regSec = editingRow.regularSeconds || 0
      if (inMins !== null && outMins !== null && outMins > inMins) {
        regSec = Math.min(28800, (outMins - inMins) * 60)
      } else if (inMins !== null && (editClockOut === 'In office' || !editClockOut)) {
        regSec = Math.min(28800, regSec || 28800)
      }

      const isClockedIn = editClockOut === 'In office' || !editClockOut
      const updatedData = {
        uid: editingRow.uid,
        displayName: editingRow.displayName,
        departmentName: editingRow.departmentName,
        date: selectedDate,
        clockInTime: editClockIn || '—',
        clockOutTime: isClockedIn ? null : editClockOut,
        clockedIn: isClockedIn,
        regularSeconds: regSec,
        regularHours: secToHrsStr(regSec),
        autoClockOut: false,
      }

      await setDoc(doc(db, 'attendanceLogs', docId), updatedData, { merge: true })
      setEditingRow(null)
    } catch (err) {
      console.error('Error saving edited attendance log:', err)
    } finally {
      setSavingEdit(false)
    }
  }

  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        const snap = await getDocs(collection(db, 'attendanceLogs'))
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setAllLogs(docs)
      } catch (err) {
        console.error('[AttendancePage] Error fetching all attendance logs:', err)
      }
    }
    fetchAllLogs()
  }, [])

  // Calculate real employee-wise attendance stats for all employees
  const employeeStatsList = useMemo(() => {
    const mapByUid = {}
    allLogs.forEach((log) => {
      if (log.uid) {
        if (!mapByUid[log.uid]) mapByUid[log.uid] = []
        mapByUid[log.uid].push(log)
      }
    })

    return employees.map((emp) => {
      const uId = emp.uid || emp.employeeId || emp.id
      const uLogs = mapByUid[uId] || []
      const stats = computeRealAttendanceStats(uLogs)
      return {
        uid: uId,
        displayName: emp.displayName || emp.name || 'Employee',
        departmentName: emp.departmentName || emp.department || 'General',
        role: emp.role || 'Team Member',
        ...stats,
      }
    })
  }, [allLogs, employees])

  // Build a UID → employee info lookup from the admin team store
  const employeeMap = useMemo(() =>
    employees.reduce((acc, emp) => {
      if (emp.uid) acc[emp.uid] = emp
      return acc
    }, {}),
    [employees]
  )

  /**
   * Subscribe to today's attendance logs from Firestore.
   * Uses flat collection: attendanceLogs/{date}_{uid}
   * Simple where('date') query — no composite index needed.
   */
  useEffect(() => {
    setLoading(true)
    setError(null)

    const logsQuery = query(
      collection(db, 'attendanceLogs'),
      where('date', '==', selectedDate)
    )

    const unsub = onSnapshot(
      logsQuery,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setAttendanceLogs(docs)
        setLoading(false)
        setLastRefresh(new Date())
        setIsLive(true)
      },
      (err) => {
        console.error('[AttendancePage] Firestore error:', err)
        setError('Unable to load live attendance data. Showing employee directory instead.')
        setLoading(false)
        setIsLive(false)
      }
    )

    return () => unsub()
  }, [selectedDate])

  // Merge: start from employees list and overlay Firestore attendance data
  const rows = React.useMemo(() => {
    const today = todayStr()
    const isPastDate = selectedDate < today

    if (attendanceLogs.length > 0) {
      // We have real Firestore data — use it directly
      return attendanceLogs.map((log) => {
        const emp = employeeMap[log.uid] || {}

        let calculatedRegularSec = log.regularSeconds || log.accumulatedWorkSeconds || 0
        let isCurrentlyClockedIn = Boolean(log.clockedIn)
        let resolvedClockOut = log.clockOutTime || null
        let isAutoClockOut = Boolean(log.autoClockOut)

        if (isPastDate) {
          // FOR PAST DATES: If employee didn't clock out, auto clock-out at 07:00 PM & cap regular hours to 8 hours max
          if (isCurrentlyClockedIn && !resolvedClockOut) {
            isCurrentlyClockedIn = false
            resolvedClockOut = '07:00 PM'
            isAutoClockOut = true
          }
          if (calculatedRegularSec <= 0 && log.clockInTime && log.clockInTime !== '—') {
            const inMins = timeStrToMinutes(log.clockInTime)
            const outMins = timeStrToMinutes(resolvedClockOut) || 19 * 60 // 7:00 PM
            if (inMins !== null && outMins > inMins) {
              const breakSec = log.accumulatedBreakSeconds || 0
              calculatedRegularSec = Math.min(28800, Math.max(0, (outMins - inMins) * 60 - breakSec))
            } else {
              calculatedRegularSec = 28800 // 8 hours default
            }
          } else {
            calculatedRegularSec = Math.min(28800, calculatedRegularSec)
          }
        } else {
          // FOR TODAY'S DATE: Calculate live shift time up to standard 8 hours (28,800 sec max)
          if (isCurrentlyClockedIn) {
            let elapsedSec = 0
            if (log.clockInTimestamp) {
              elapsedSec = Math.max(0, Math.floor((Date.now() - log.clockInTimestamp) / 1000))
            } else if (log.clockInTime) {
              const mins = timeStrToMinutes(log.clockInTime)
              if (mins !== null) {
                const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                if (nowMins >= mins) {
                  elapsedSec = (nowMins - mins) * 60
                }
              }
            }
            const breakSec = log.accumulatedBreakSeconds || 0
            const liveShiftSec = Math.max(0, elapsedSec - breakSec)

            // Cap regular hours at standard 8 hours (28,800 sec)
            calculatedRegularSec = Math.min(28800, Math.max(calculatedRegularSec, liveShiftSec))

            // Auto clock-out if current time is past 7:00 PM (hour >= 19) or elapsed shift reached 8 hours
            const currentHour = new Date().getHours()
            if ((currentHour >= 19 || liveShiftSec >= 28800) && !resolvedClockOut) {
              resolvedClockOut = '07:00 PM'
              isAutoClockOut = true
              isCurrentlyClockedIn = false
            }
          } else {
            calculatedRegularSec = Math.min(28800, calculatedRegularSec)
          }
        }

        return {
          uid: log.uid,
          displayName: log.displayName || emp.displayName || '—',
          departmentName: log.departmentName || emp.departmentName || '—',
          clockInTime: log.clockInTime || '—',
          clockOutTime: resolvedClockOut,
          clockedIn: isCurrentlyClockedIn,
          isOnBreak: log.isOnBreak || false,
          isInExtraTime: log.isInExtraTime || false,
          regularHours: secToHrsStr(calculatedRegularSec),
          extraHours: log.extraHours || secToHrsStr(log.extraSeconds),
          regularSeconds: calculatedRegularSec,
          extraSeconds: log.extraSeconds || 0,
          autoClockOut: isAutoClockOut,
          shiftLogs: log.shiftLogs || [],
        }
      })
    }

    // Fallback: show employees without attendance data for today
    return employees.map((emp) => ({
      uid: emp.uid,
      displayName: emp.displayName || '—',
      departmentName: emp.departmentName || '—',
      clockInTime: '—',
      clockOutTime: null,
      clockedIn: false,
      isOnBreak: false,
      isInExtraTime: false,
      regularHours: '0h 0m',
      extraHours: '0h 0m',
      regularSeconds: 0,
      extraSeconds: 0,
      autoClockOut: false,
      shiftLogs: [],
    }))
  }, [attendanceLogs, employees, employeeMap])

  const presentCount = rows.filter((r) => r.clockedIn || r.clockOutTime).length
  const activeNow = rows.filter((r) => r.clockedIn && !r.isOnBreak).length
  const onBreakCount = rows.filter((r) => r.isOnBreak).length
  const extraTimeCount = rows.filter((r) => r.isInExtraTime).length

  const getStatusBadge = (row) => {
    if (row.isInExtraTime) {
      return (
        <Badge variant="brand" className="flex items-center gap-1 animate-pulse">
          <Zap className="w-3 h-3" /> Extra Time
        </Badge>
      )
    }
    if (row.isOnBreak) {
      return <Badge variant="warning">On Break</Badge>
    }
    if (row.clockedIn) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Present
        </Badge>
      )
    }
    if (row.clockOutTime) {
      return <Badge variant="secondary">Clocked Out</Badge>
    }
    return <Badge variant="danger">Absent</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Attendance & Daily Presence Tracker"
          description="Real-time employee clock-in/out tracking, shift logs, and presence status"
        />

        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <NavLink
            to="/team/employees"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Users className="w-3.5 h-3.5" /> Employee Directory
          </NavLink>
          <NavLink
            to="/team/attendance"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Attendance Tracker
          </NavLink>
          <NavLink
            to="/team/leave"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`
            }
          >
            <Calendar className="w-3.5 h-3.5" /> Leave Management
          </NavLink>
        </div>
      </div>

      {/* Live status bar + date picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
            isLive
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            {isLive ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Live</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Offline</span>
              </>
            )}
          </div>

          {lastRefresh && (
            <span className="text-[11px] text-slate-500">
              Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-medium">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          />
          <button
            onClick={() => setSelectedDate(todayStr())}
            className="text-xs px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl hover:bg-indigo-600/30 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{presentCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Present Today</div>
          </div>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <LogIn className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{activeNow}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Now</div>
          </div>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Coffee className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{onBreakCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">On Break</div>
          </div>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{extraTimeCount}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Extra Time</div>
          </div>
        </Card>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Attendance Table */}
      <Card className="overflow-x-auto p-0 border-slate-800">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading attendance data…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-sm gap-2">
            <Users className="w-8 h-8 opacity-30" />
            <p>No attendance records for {formatDate(selectedDate)}</p>
            <p className="text-xs text-slate-600">Employees will appear here once they clock in.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="p-4 font-semibold">Employee</th>
                <th className="p-4 font-semibold">Department</th>
                <th className="p-4 font-semibold">Clock In</th>
                <th className="p-4 font-semibold">Clock Out</th>
                <th className="p-4 font-semibold">Regular Hours</th>
                <th className="p-4 font-semibold">Extra / OT Hours</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((row) => (
                <tr
                  key={row.uid}
                  className="hover:bg-slate-800/30 transition-colors text-slate-300"
                >
                  {/* Employee name + avatar */}
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {row.displayName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-semibold text-slate-100">{row.displayName}</span>
                    </div>
                  </td>

                  <td className="p-4 text-slate-400">{row.departmentName || '—'}</td>

                  {/* Clock In */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <LogIn className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className={row.clockInTime === '—' ? 'text-slate-600' : 'text-slate-200 font-mono'}>
                        {row.clockInTime}
                      </span>
                    </div>
                  </td>

                  {/* Clock Out */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className={!row.clockOutTime ? 'text-slate-600 italic' : 'text-slate-200 font-mono'}>
                        {row.clockOutTime || (row.clockedIn ? 'In office' : '—')}
                      </span>
                      {row.autoClockOut && (
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] rounded-md">
                          Auto
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Regular Hours */}
                  <td className="p-4">
                    <span className={`font-semibold font-mono ${row.regularSeconds > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>
                      {row.regularHours}
                    </span>
                  </td>

                  {/* Extra / OT Hours */}
                  <td className="p-4">
                    {row.extraSeconds > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="font-semibold font-mono text-violet-400">{row.extraHours}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="p-4">{getStatusBadge(row)}</td>

                  {/* Admin Edit Action */}
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setEditingRow(row)
                        setEditClockIn(row.clockInTime === '—' ? '09:00 AM' : row.clockInTime)
                        setEditClockOut(row.clockOutTime || 'In office')
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors inline-flex items-center gap-1 text-[11px] font-medium"
                      title="Edit Employee Time"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Time
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Shift Log detail cards (shown when Firestore data available) */}
      {attendanceLogs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Today's Shift Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {rows
              .filter((r) => r.shiftLogs && r.shiftLogs.length > 0)
              .map((row) => (
                <Card key={row.uid} className="p-4 border-slate-800 bg-slate-900/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                      {row.displayName?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{row.displayName}</span>
                    {getStatusBadge(row)}
                  </div>

                  <div className="space-y-1.5">
                    {[...row.shiftLogs]
                      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
                      .map((log, i) => (
                        <div
                          key={log.id || i}
                          className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/30"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                log.type === 'clock_in'
                                  ? 'bg-emerald-400'
                                  : log.type === 'clock_out' || log.type === 'auto_clock_out'
                                  ? 'bg-rose-400'
                                  : log.type === 'extra_start' || log.type === 'extra_end'
                                  ? 'bg-violet-400'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <span className="text-slate-300">{log.label}</span>
                          </div>
                          <span className="font-mono text-slate-500">{log.time}</span>
                        </div>
                      ))}
                  </div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Employee-Wise Attendance Metrics Section */}
      <div className="space-y-3 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" /> Employee-Wise Attendance Averages & Metrics
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Real calculated averages across all logged shifts
          </span>
        </div>

        <Card className="overflow-x-auto p-0 border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="p-4 font-semibold">Employee</th>
                <th className="p-4 font-semibold">Department</th>
                <th className="p-4 font-semibold">Avg Hours / Day</th>
                <th className="p-4 font-semibold">Avg Check-In</th>
                <th className="p-4 font-semibold">Avg Arrival Time</th>
                <th className="p-4 font-semibold">Avg Check-Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {employeeStatsList.map((emp) => (
                <tr key={emp.uid} className="hover:bg-slate-800/30 transition-colors text-slate-300">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {emp.displayName?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-100">{emp.displayName}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-400">{emp.departmentName}</td>
                  <td className="p-4 font-semibold font-mono text-sky-400">{emp.avgHours}</td>
                  <td className="p-4 font-semibold font-mono text-emerald-400">{emp.avgCheckIn}</td>
                  <td className="p-4 font-semibold font-mono text-teal-400">{emp.avgArrival}</td>
                  <td className="p-4 font-semibold font-mono text-purple-400">{emp.avgCheckOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Edit Attendance Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative rounded-2xl bg-white dark:bg-[#181C27] text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm">Edit Attendance Record</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingRow.displayName} ({formatDate(selectedDate)})
                </p>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Clock In Time (e.g. 09:30 AM, 10:00 AM)
                </label>
                <input
                  type="text"
                  value={editClockIn}
                  onChange={(e) => setEditClockIn(e.target.value)}
                  placeholder="09:00 AM"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2 px-3 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Clock Out Time (e.g. 06:30 PM, or 'In office')
                </label>
                <input
                  type="text"
                  value={editClockOut}
                  onChange={(e) => setEditClockOut(e.target.value)}
                  placeholder="06:00 PM or In office"
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2 px-3 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="w-1/3 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-2/3 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 text-white"
                >
                  {savingEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
