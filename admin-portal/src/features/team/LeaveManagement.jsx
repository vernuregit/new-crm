import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useTeamStore } from './stores/teamStore'
import { useUserStore } from '../../stores/userStore'
import { getEmployees, getLeaveRequests, createLeaveRequest, updateLeaveStatusInDb } from './services/teamService'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'
import { Users, CheckCircle2, Calendar, Plus, Check, X, AlertTriangle, PartyPopper, CalendarDays } from 'lucide-react'

export const LeaveManagement = () => {
  const { employees, setEmployees, leaveRequests, setLeaveRequests, addLeaveRequest, updateLeaveStatus } = useTeamStore()
  const { user } = useUserStore()
  const adminName = user?.displayName || user?.email || 'Admin'

  const [showAddModal, setShowAddModal] = useState(false)
  const [employeeName, setEmployeeName] = useState('')
  const [leaveType, setLeaveType] = useState('Annual Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState('')

  // Load employees from Firestore
  useEffect(() => {
    getEmployees().then((empData) => {
      if (empData && empData.length > 0) setEmployees(empData)
    })
  }, [setEmployees])

  // Subscribe to real-time Firestore leave requests
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => {
        const list = snap.docs.map((d) => ({ leaveId: d.id, ...d.data() }))
        setLeaveRequests(list)
      },
      (err) => {
        console.error('Error listening to leave requests:', err)
      }
    )
    return () => unsub()
  }, [setLeaveRequests])

  // Set default employee once employees are loaded
  useEffect(() => {
    if (employees.length > 0 && !employeeName) {
      setEmployeeName(employees[0].displayName || employees[0].name || '')
    }
  }, [employees, employeeName])

  const handleRequestLeave = async (e) => {
    e.preventDefault()
    setValidationError('')

    const reqStartDate = startDate ? new Date(startDate) : new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    reqStartDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((reqStartDate - today) / (1000 * 60 * 60 * 24))

    const isUrgentLeave = leaveType === 'Sick Leave' || leaveType === 'Emergency Leave'

    if (!isUrgentLeave && diffDays < 3) {
      setValidationError(
        'Standard leave must be requested at least 3 days in advance. Select "Sick Leave" or "Emergency Leave" for urgent requests.'
      )
      return
    }

    const leaveData = {
      employeeName,
      leaveType,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      days: startDate && endDate
        ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
        : 1,
      reason: reason || `${leaveType} request`,
    }

    const created = await createLeaveRequest(leaveData)
    addLeaveRequest(created)

    setLeaveType('Annual Leave')
    setStartDate('')
    setEndDate('')
    setReason('')
    setValidationError('')
    setShowAddModal(false)
  }

  const handleUpdateLeaveStatus = async (leaveId, newStatus) => {
    updateLeaveStatus(leaveId, newStatus)
    await updateLeaveStatusInDb(leaveId, newStatus, adminName)
  }

  // Helper to resolve employee name, avatar, and email details from employee list or email
  const getEmployeeInfo = (req) => {
    const matched = employees.find(
      (e) =>
        (req.employeeId && (e.uid === req.employeeId || e.employeeId === req.employeeId)) ||
        (req.employeeEmail && e.email?.toLowerCase() === req.employeeEmail.toLowerCase()) ||
        (req.employeeName &&
          req.employeeName !== 'Team Staff' &&
          (e.displayName?.toLowerCase() === req.employeeName.toLowerCase() || e.name?.toLowerCase() === req.employeeName.toLowerCase()))
    )

    let name = matched?.displayName || matched?.name || req.employeeName
    let email = req.employeeEmail || matched?.email || ''
    let role = matched?.role || matched?.department || matched?.designation || ''

    if (!name || name === 'Team Staff') {
      if (email) {
        name = email
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      } else {
        name = 'Team Member'
      }
    }

    const avatar = matched?.avatar || matched?.photoURL || null
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0].toUpperCase())
          .join('')
      : 'TM'

    return { name, email, role, avatar, initials }
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Leave & PTO Management"
          description="Employee leave requests, PTO balances, annual holidays, and manager approvals"
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
          <NavLink
            to="/team/holidays"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <PartyPopper className="w-3.5 h-3.5" /> Public Holidays
          </NavLink>
          <NavLink
            to="/team/timeline"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`
            }
          >
            <CalendarDays className="w-3.5 h-3.5" /> Work Timeline
          </NavLink>
        </div>
      </div>

      {/* Leave Requests Table */}
      <Card className="overflow-x-auto p-0 border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
              <th className="p-4 font-semibold">Employee</th>
              <th className="p-4 font-semibold">Leave Type</th>
              <th className="p-4 font-semibold">Duration</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Manager Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {leaveRequests.map((req) => (
              <tr key={req.leaveId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300">
                <td className="p-4">
                  {(() => {
                    const info = getEmployeeInfo(req)
                    return (
                      <div className="flex items-center gap-3">
                        {info.avatar ? (
                          <img
                            src={info.avatar}
                            alt={info.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                            {info.initials}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate">
                            {info.name}
                          </span>
                          {info.email ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {info.email}
                            </span>
                          ) : info.role ? (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {info.role}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )
                  })()}
                </td>
                <td className="p-4 text-slate-800 dark:text-slate-300 font-medium">{req.leaveType}</td>
                <td className="p-4 text-slate-600 dark:text-slate-400">
                  {req.startDate} to {req.endDate} ({req.days} days)
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{req.reason}</td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <Badge
                      variant={
                        req.status === 'approved'
                          ? 'success'
                          : req.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {req.status}
                    </Badge>
                    {req.reviewedBy && req.status !== 'pending' && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        by {req.reviewedBy}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right space-x-2">
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleUpdateLeaveStatus(req.leaveId, 'approved')}
                        className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-500/30 transition-colors"
                        title="Approve Leave"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdateLeaveStatus(req.leaveId, 'rejected')}
                        className="p-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-500/30 transition-colors"
                        title="Reject Leave"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Request Leave Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative rounded-2xl bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-[#11141E]/95 backdrop-blur-md z-10 py-1">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Submit Leave Request</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestLeave} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Employee</label>
                <select
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.uid || emp.employeeId} value={emp.displayName} className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">
                      {emp.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
                >
                  <option value="Annual Leave" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Annual Leave</option>
                  <option value="Sick Leave" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Sick Leave</option>
                  <option value="Casual Leave" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Casual Leave</option>
                  <option value="Unpaid Leave" className="bg-white dark:bg-[#11141E] text-slate-900 dark:text-slate-100">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <Input
                label="Reason for Leave"
                placeholder="Brief explanation..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)} className="w-1/3">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" className="w-2/3" icon={Plus}>
                  Submit Request
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
