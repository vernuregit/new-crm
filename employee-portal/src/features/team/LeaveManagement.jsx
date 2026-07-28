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
import { Users, CheckCircle2, Calendar, Plus, Check, X, Loader2, Clock, AlertCircle, AlertTriangle, ShieldCheck, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'

// ─── Modern Interactive Calendar Picker Component ─────────────────────────────
const InteractiveCalendarPicker = ({ startDate, setStartDate, endDate, setEndDate, isMultiDay, setIsMultiDay, leaveType, setValidationError }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()

  const todayStr = new Date().toISOString().split('T')[0]

  // Dynamic min allowed date calculation:
  // Company works Mon-Sat (6 days). Sunday = 0 is non-working.
  const getMinAllowedDate = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (leaveType === 'Sick Leave' || leaveType === 'Emergency Leave') {
      return todayStr
    }

    let workingDaysAdded = 0
    const cursor = new Date(today)
    while (workingDaysAdded < 3) {
      cursor.setDate(cursor.getDate() + 1)
      if (cursor.getDay() !== 0) {
        workingDaysAdded++
      }
    }
    return cursor.toISOString().split('T')[0]
  }

  const minAllowedDate = getMinAllowedDate()

  const handleDayClick = (day) => {
    const mStr = String(currentMonth + 1).padStart(2, '0')
    const dStr = String(day).padStart(2, '0')
    const clickedDate = `${currentYear}-${mStr}-${dStr}`

    if (clickedDate < minAllowedDate) {
      if (leaveType === 'Sick Leave' || leaveType === 'Emergency Leave') {
        setValidationError('Past dates cannot be selected.')
      } else {
        setValidationError(`Standard leaves require 3 working days advance notice. Earliest available date is ${minAllowedDate}.`)
      }
      return
    }

    setValidationError('')

    // Intuitive Range / Single Date Selection
    if (!startDate || (startDate && endDate && startDate !== endDate)) {
      setStartDate(clickedDate)
      setEndDate(clickedDate)
    } else if (startDate && (!endDate || endDate === startDate)) {
      if (clickedDate < startDate) {
        setStartDate(clickedDate)
        setEndDate(clickedDate)
      } else {
        setEndDate(clickedDate)
      }
    }
  }

  const daysCount = startDate && endDate
    ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
    : 1

  return (
    <div className="space-y-2">
      {/* Trigger Button (Always visible) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#11141E] border border-indigo-500/30 hover:border-indigo-500/60 text-slate-100 text-xs font-medium rounded-xl py-3 px-3.5 flex items-center justify-between transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          {startDate ? (
            endDate && endDate !== startDate ? (
              <span className="text-slate-200">
                Leave: <strong className="text-indigo-400 font-semibold">{startDate}</strong> to <strong className="text-indigo-400 font-semibold">{endDate}</strong> ({daysCount} Days)
              </span>
            ) : (
              <span className="text-slate-200">
                Leave Date: <strong className="text-indigo-400 font-semibold">{startDate}</strong> (1 Day)
              </span>
            )
          ) : (
            <span className="text-slate-400">Click to choose leave date from calendar...</span>
          )}
        </div>
        <span className="text-[11px] text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
          {isOpen ? 'Close Calendar' : startDate ? 'Change Date' : 'Choose Date'}
        </span>
      </button>

      {/* Expandable Calendar Grid */}
      {isOpen && (
        <div className="space-y-3 bg-[#11141E] border border-slate-800 rounded-2xl p-4 text-left shadow-xl transition-all">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-slate-100 text-xs">
                {months[currentMonth]} {currentYear}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
            {weekDays.map((wd) => (
              <div key={wd} className="py-1">{wd}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty_${i}`} className="py-2" />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1
              const mStr = String(currentMonth + 1).padStart(2, '0')
              const dStr = String(day).padStart(2, '0')
              const dateStr = `${currentYear}-${mStr}-${dStr}`

              const isToday = dateStr === todayStr
              const isDisabled = dateStr < minAllowedDate
              const isSelectedStart = dateStr === startDate
              const isSelectedEnd = dateStr === endDate
              const isInRange = startDate && endDate && dateStr > startDate && dateStr < endDate

              let cellClass = 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-600/20 hover:text-indigo-600 dark:hover:text-indigo-300 font-medium'
              if (isDisabled) {
                // Light slate disabled state with line-through for high visibility
                cellClass = 'text-slate-400 dark:text-slate-500/80 opacity-60 cursor-not-allowed line-through bg-slate-100 dark:bg-slate-900/30 font-normal'
              } else if (isSelectedStart || isSelectedEnd) {
                cellClass = 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
              } else if (isInRange) {
                cellClass = 'bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-semibold'
              } else if (isToday) {
                cellClass = 'border border-indigo-500/50 text-indigo-600 dark:text-indigo-400 font-bold'
              }

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDayClick(day)}
                  className={`py-2 rounded-xl text-xs transition-all ${cellClass}`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-medium">
              Click start and end dates to select leave range
            </span>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const LeaveManagement = () => {
  const { employees, setEmployees, leaveRequests, setLeaveRequests, addLeaveRequest, updateLeaveStatus } = useTeamStore()
  const { user } = useUserStore()

  const loggedInEmployeeName = user?.displayName || 'Team Staff'

  const [showAddModal, setShowAddModal] = useState(false)
  const [leaveType, setLeaveType] = useState('Annual Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isMultiDay, setIsMultiDay] = useState(false)
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState('')
  const [loadingLeave, setLoadingLeave] = useState(false)

  // Real-time Firestore sync for leave requests
  useEffect(() => {
    setLoadingLeave(true)
    const unsub = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => {
        const list = snap.docs.map((d) => ({ leaveId: d.id, ...d.data() }))
        setLeaveRequests(list)
        setLoadingLeave(false)
      },
      (err) => {
        console.error('Error listening to leave requests:', err)
        setLoadingLeave(false)
      }
    )
    getEmployees().then((empData) => {
      if (empData && empData.length > 0) setEmployees(empData)
    })
    return () => unsub()
  }, [setLeaveRequests, setEmployees])

  // Only show this employee's own leave requests
  const myLeaveRequests = leaveRequests.filter(
    (l) => l.employeeName === loggedInEmployeeName
  )

  const pendingRequests = myLeaveRequests.filter((l) => l.status === 'pending').length
  const approvedRequests = myLeaveRequests.filter((l) => l.status === 'approved')
  const rejectedRequests = myLeaveRequests.filter((l) => l.status === 'rejected')

  // Dynamic PTO and Allowance calculations based on approved leave requests
  const approvedAnnualDays = approvedRequests
    .filter((l) => l.leaveType === 'Annual Leave' || l.leaveType === 'Casual Leave')
    .reduce((sum, l) => sum + (Number(l.days) || 1), 0)

  const approvedSickDays = approvedRequests
    .filter((l) => l.leaveType === 'Sick Leave' || l.leaveType === 'Emergency Leave')
    .reduce((sum, l) => sum + (Number(l.days) || 1), 0)

  const remainingAnnualDays = Math.max(0, 24 - approvedAnnualDays)
  const remainingSickDays = Math.max(0, 10 - approvedSickDays)

  const handleRequestLeave = async (e) => {
    e.preventDefault()
    setValidationError('')

    // Require reason
    if (!reason.trim()) {
      setValidationError('Reason for leave is required.')
      return
    }

    if (!startDate) {
      setValidationError('Please select a leave date.')
      return
    }

    const reqStartDate = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    reqStartDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((reqStartDate - today) / (1000 * 60 * 60 * 24))

    // ─── 3-Day Advance Notice Rule ───
    // Emergency & Sick Leave are exempt from the 3-day advance notice rule.
    const isUrgentLeave = leaveType === 'Sick Leave' || leaveType === 'Emergency Leave'

    if (!isUrgentLeave && diffDays < 3) {
      setValidationError(
        'Standard leave must be requested at least 3 days in advance. For urgent situations, please select "Sick Leave" or "Emergency Leave".'
      )
      return
    }

    const finalEndDate = isMultiDay && endDate ? endDate : startDate
    const daysCount = isMultiDay && startDate && endDate
      ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
      : 1

    const leaveData = {
      employeeName: loggedInEmployeeName,
      leaveType,
      startDate,
      endDate: finalEndDate,
      days: daysCount,
      reason: reason.trim(),
    }

    const created = await createLeaveRequest(leaveData)
    addLeaveRequest(created)

    setLeaveType('Annual Leave')
    setStartDate('')
    setEndDate('')
    setIsMultiDay(false)
    setReason('')
    setValidationError('')
    setShowAddModal(false)
  }

  const handleUpdateLeaveStatus = async (leaveId, newStatus) => {
    updateLeaveStatus(leaveId, newStatus)
    await updateLeaveStatusInDb(leaveId, newStatus)
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Leave & PTO Management"
          description="Employee leave requests, PTO balances, annual holidays, and manager approvals"
          actions={
            <Button icon={Plus} variant="primary" onClick={() => setShowAddModal(true)}>
              Request Leave
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

      {/* Granted / Approved Leave Status Notification Banner */}
      {approvedRequests.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-300 dark:border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 dark:text-slate-100 text-sm flex items-center gap-2">
                Your leave is granted!
              </h4>
              <p className="text-xs text-emerald-800 dark:text-slate-300 mt-0.5">
                {approvedRequests[0].leaveType} ({approvedRequests[0].startDate} to {approvedRequests[0].endDate}) for {approvedRequests[0].employeeName} has been approved
                {approvedRequests[0].reviewedBy ? ` by ${approvedRequests[0].reviewedBy}` : ' by management'}.
              </p>
            </div>
          </div>
          <Badge variant="success">Granted</Badge>
        </div>
      )}

      {/* Rejected Leave Status Banner */}
      {rejectedRequests.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-rose-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm">
                Leave Request Notice
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {rejectedRequests[0].leaveType} request for {rejectedRequests[0].employeeName} was declined
                {rejectedRequests[0].reviewedBy ? ` by ${rejectedRequests[0].reviewedBy}` : ' by administrator'}.
              </p>
            </div>
          </div>
          <Badge variant="danger">Declined</Badge>
        </div>
      )}

      {/* PTO Balance Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Annual PTO Balance
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{remainingAnnualDays} / 24 Days</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sick & Emergency Allowance
            </span>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{remainingSickDays} / 10 Days</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Approvals
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingRequests} Requests</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Approved Leave
            </span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{approvedRequests.length} Requests</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Leave Requests Table */}
      <Card className="overflow-x-auto p-0 border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
              <th className="p-4 font-semibold">Leave Type</th>
              <th className="p-4 font-semibold">Duration</th>
              <th className="p-4 font-semibold">Reason</th>
              <th className="p-4 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {myLeaveRequests.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No leave requests submitted yet. Click "Request Leave" above to apply.
                </td>
              </tr>
            ) : (
              myLeaveRequests.map((req) => (
                <tr key={req.leaveId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300">
                  <td className="p-4 text-slate-800 dark:text-slate-300 font-medium">{req.leaveType}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">
                    {req.startDate} to {req.endDate} ({req.days} days)
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{req.reason}</td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'success'
                            : req.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {req.status === 'approved' ? 'Granted' : req.status === 'rejected' ? 'Declined' : 'Pending Review'}
                      </Badge>
                      {req.reviewedBy && req.status !== 'pending' && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          by {req.reviewedBy}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Request Leave Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl relative rounded-2xl bg-white dark:bg-[#181C27]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-[#181C27]/95 backdrop-blur-md z-10 py-1">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Submit Leave Request</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setValidationError('')
                }}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {validationError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-600 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleRequestLeave} className="space-y-4">


              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => {
                    setLeaveType(e.target.value)
                    setValidationError('')
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave </option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Casual Leave">Casual Leave </option>
                </select>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Select Date Range</label>
                <InteractiveCalendarPicker
                  startDate={startDate}
                  setStartDate={setStartDate}
                  endDate={endDate}
                  setEndDate={setEndDate}
                  leaveType={leaveType}
                  setValidationError={setValidationError}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">Reason for Request</label>
                <textarea
                  placeholder="State the purpose for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded-xl p-3 h-20 focus:outline-none focus:border-indigo-500 placeholder-slate-400 dark:placeholder-slate-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddModal(false)
                    setValidationError('')
                  }}
                  className="w-1/3"
                >
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
