import React, { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useTeamStore } from './stores/teamStore'
import { getEmployees, recordAttendanceInDb } from './services/teamService'
import { Users, CheckCircle2, Calendar, Clock, LogIn, LogOut, ShieldCheck, UserCheck } from 'lucide-react'

export const AttendancePage = () => {
  const { employees, setEmployees, clockedIn, clockInTime, toggleClockIn } = useTeamStore()

  useEffect(() => {
    if (employees.length === 0) {
      getEmployees().then((data) => {
        if (data && data.length > 0) setEmployees(data)
      })
    }
  }, [employees.length, setEmployees])

  const handleClockToggle = async () => {
    toggleClockIn()
    await recordAttendanceInDb({
      action: clockedIn ? 'clock_out' : 'clock_in',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
    })
  }

  const activePresent = employees.filter((e) => e.status === 'active').length
  const onLeaveCount = employees.filter((e) => e.status !== 'active').length

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Attendance & Daily Presence Tracker"
          description="Real-time employee clock-in/out tracking, shift logs, and presence status"
          actions={
            <Button
              icon={clockedIn ? LogOut : LogIn}
              variant={clockedIn ? 'danger' : 'primary'}
              onClick={handleClockToggle}
            >
              {clockedIn ? `Clock Out (${clockInTime})` : 'Clock In Now'}
            </Button>
          }
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
              Your Current Status: <span className={clockedIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{clockedIn ? `Clocked In since ${clockInTime}` : 'Clocked Out'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Shift duration automatically calculated and synced with staff attendance records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={clockedIn ? 'success' : 'warning'}>
            {clockedIn ? 'On Duty' : 'Off Duty'}
          </Badge>
        </div>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Staff Registered
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">{employees.length} Employees</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Currently Present
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activePresent} Members</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              On Scheduled Leave
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{onLeaveCount} Members</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Attendance Table */}
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
            {employees.map((emp) => (
              <tr key={emp.uid || emp.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300">
                <td className="p-4 font-bold text-slate-900 dark:text-slate-200">{emp.displayName}</td>
                <td className="p-4 text-slate-800 dark:text-slate-300">{emp.departmentName || 'Engineering'}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">09:00 AM</td>
                <td className="p-4 font-semibold text-indigo-600 dark:text-indigo-400">8.0 hrs</td>
                <td className="p-4">
                  <Badge variant={emp.status === 'active' ? 'success' : 'warning'}>
                    {emp.status === 'active' ? 'Present' : 'On Leave'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

