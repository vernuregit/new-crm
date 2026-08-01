import React, { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useTeamStore } from './stores/teamStore'
import { useUserStore } from '../../stores/userStore'
import { getEmployees, recordAttendanceInDb } from './services/teamService'
import { AttendanceMetricsBar } from './components/AttendanceMetricsBar'
import { Users, CheckCircle2, Calendar, Clock, LogIn, LogOut } from 'lucide-react'

export const AttendancePage = () => {
  const { employees, setEmployees, clockedIn, clockInTime, toggleClockIn, loadUserAttendance } = useTeamStore()
  const { user, userDoc } = useUserStore()

  const activeUid = userDoc?.uid || user?.uid
  const loggedInName = userDoc?.displayName || user?.displayName || user?.email || ''

  useEffect(() => {
    if (activeUid) {
      loadUserAttendance(activeUid)
    }
  }, [activeUid, loadUserAttendance])

  useEffect(() => {
    if (employees.length === 0) {
      getEmployees().then((data) => {
        if (data && data.length > 0) setEmployees(data)
      })
    }
  }, [employees.length, setEmployees])

  const handleClockToggle = async () => {
    toggleClockIn({
      uid: activeUid,
      displayName: loggedInName,
      departmentName: userDoc?.departmentName || '',
    })
    await recordAttendanceInDb({
      uid: activeUid,
      displayName: loggedInName,
      action: clockedIn ? 'clock_out' : 'clock_in',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
    })
  }

  // Only show the currently logged-in employee's record
  const myRecord = employees.find(
    (e) => e.displayName === loggedInName || e.uid === user?.uid
  )

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Attendance & Daily Presence Tracker"
          description="Your clock-in/out status, shift log, and daily presence"
        />

        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <NavLink
            to="/directory"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Users className="w-3.5 h-3.5" /> Employee Directory
          </NavLink>
          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <Calendar className="w-3.5 h-3.5" /> Leave Management
          </NavLink>
        </div>
      </div>

      {/* Clock Status Banner */}
      <Card className="p-5 bg-gradient-to-r from-slate-100 via-indigo-50/50 to-slate-100 dark:from-slate-900 dark:via-[#141824] dark:to-indigo-950/40 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shadow-lg ${clockedIn ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Your Current Status:{' '}
              <span className={clockedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {clockedIn ? `Clocked In since ${clockInTime}` : 'Clocked Out'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Shift duration automatically calculated and synced with your attendance records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={clockedIn ? 'success' : 'warning'}>
            {clockedIn ? 'On Duty' : 'Off Duty'}
          </Badge>
        </div>
      </Card>

      {/* Personal Summary Metrics: 5-Card Bar (Status, Clock In, Clock Out, Worked Hours, Late By) */}
      <AttendanceMetricsBar />

      {/* My Attendance Record */}
      <Card className="overflow-x-auto p-0 border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
              <th className="p-4 font-semibold">Employee</th>
              <th className="p-4 font-semibold">Department</th>
              <th className="p-4 font-semibold">Clock In Time</th>
              <th className="p-4 font-semibold">Shift Hours</th>
              <th className="p-4 font-semibold">Presence Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {myRecord ? (
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300">
                <td className="p-4 font-bold text-slate-900 dark:text-slate-200">{myRecord.displayName}</td>
                <td className="p-4 text-slate-800 dark:text-slate-300">{myRecord.departmentName || '—'}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">{clockedIn ? clockInTime : '—'}</td>
                <td className="p-4 font-semibold text-indigo-600 dark:text-indigo-400">
                  {clockedIn ? '8.0 hrs' : '—'}
                </td>
                <td className="p-4">
                  <Badge variant={clockedIn ? 'success' : 'warning'}>
                    {clockedIn ? 'Present' : 'Off Duty'}
                  </Badge>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No attendance record found. Clock in to start your shift.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
