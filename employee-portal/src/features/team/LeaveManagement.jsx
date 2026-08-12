import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { useTeamStore } from './stores/teamStore'
import { useUserStore } from '../../stores/userStore'
import { getEmployees, createLeaveRequest, updateLeaveStatusInDb, deleteLeaveRequestFromDb } from './services/teamService'
import {
  resolveEmployeeWfhPolicy,
  countUsedWfhDays,
  validateWfhRequest,
  getWfhAllowanceLabel,
  getWfhLeaveStatus,
} from './services/wfhPolicyUtils'
import { Users, CheckCircle2, Calendar, Plus, X, Clock, AlertCircle, AlertTriangle, ShieldCheck, ChevronLeft, ChevronRight, Trash2, Ban } from 'lucide-react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../shared/services/firebaseService'

const SINGLE_DAY_LEAVE_TYPES = new Set([
  'Work From Home',
  'Sick Leave',
  'Casual Leave',
])

const isSingleDayLeaveType = (type) => SINGLE_DAY_LEAVE_TYPES.has(type)

// ─── Modern Interactive Calendar Picker Component ─────────────────────────────
const InteractiveCalendarPicker = ({ startDate, setStartDate, endDate, setEndDate, leaveType, setValidationError }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const singleDayOnly = isSingleDayLeaveType(leaveType)

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

  const toLocalDateStr = (d) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const todayLocal = new Date()
  todayLocal.setHours(0, 0, 0, 0)
  const todayStr = toLocalDateStr(todayLocal)

  // Min selectable date by leave type.
  // Casual Leave: exactly 3 calendar days in advance (today + 3).
  // Urgent types: today onwards.
  const getMinAllowedDate = () => {
    if (
      leaveType === 'Sick Leave' ||
      leaveType === 'LOP (Loss of Pay)' ||
      leaveType === 'Work From Home' ||
      leaveType === 'On Duty'
    ) {
      return todayStr
    }

    if (leaveType === 'Casual Leave') {
      const cursor = new Date(todayLocal)
      cursor.setDate(cursor.getDate() + 3)
      return toLocalDateStr(cursor)
    }

    // Other standard leave types: 3 calendar days advance
    const cursor = new Date(todayLocal)
    cursor.setDate(cursor.getDate() + 3)
    return toLocalDateStr(cursor)
  }

  const minAllowedDate = getMinAllowedDate()

  const handleDayClick = (day) => {
    const mStr = String(currentMonth + 1).padStart(2, '0')
    const dStr = String(day).padStart(2, '0')
    const clickedDate = `${currentYear}-${mStr}-${dStr}`

    if (clickedDate < minAllowedDate) {
      if (
        leaveType === 'Sick Leave' ||
        leaveType === 'LOP (Loss of Pay)' ||
        leaveType === 'Work From Home' ||
        leaveType === 'On Duty'
      ) {
        setValidationError('Past dates cannot be selected.')
      } else if (leaveType === 'Casual Leave') {
        setValidationError(
          `Casual Leave can only be selected at least 3 days in advance. Earliest available date is ${minAllowedDate}.`
        )
      } else {
        setValidationError(`Standard leaves require 3 days advance notice. Earliest available date is ${minAllowedDate}.`)
      }
      return
    }

    setValidationError('')

    // WFH / Sick / Casual: single date only (1 Day)
    if (singleDayOnly) {
      setStartDate(clickedDate)
      setEndDate(clickedDate)
      return
    }

    // On Duty and other types: allow start–end range
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

  const daysCount = singleDayOnly
    ? 1
    : startDate && endDate
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
            singleDayOnly || !endDate || endDate === startDate ? (
              <span className="text-slate-200">
                Leave Date: <strong className="text-indigo-400 font-semibold">{startDate}</strong> (1 Day)
              </span>
            ) : (
              <span className="text-slate-200">
                Leave: <strong className="text-indigo-400 font-semibold">{startDate}</strong> to <strong className="text-indigo-400 font-semibold">{endDate}</strong> ({daysCount} Days)
              </span>
            )
          ) : (
            <span className="text-slate-400">
              {singleDayOnly ? 'Click to choose leave date from calendar...' : 'Click to choose leave dates from calendar...'}
            </span>
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
              const isSelectedEnd = !singleDayOnly && dateStr === endDate && endDate !== startDate
              const isInRange = !singleDayOnly && startDate && endDate && dateStr > startDate && dateStr < endDate

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
              {leaveType === 'Casual Leave'
                ? `Casual Leave: select a date from ${minAllowedDate} onwards (3 days advance)`
                : singleDayOnly
                  ? 'Select a single date (1 Day)'
                  : 'Click start and end dates to select leave range'}
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
  const { employees, setEmployees, leaveRequests, setLeaveRequests, addLeaveRequest, updateLeaveStatus, removeLeaveRequest } = useTeamStore()
  const { user, userDoc } = useUserStore()

  // Match current user in employees list or derive from userDoc / user / email
  const currentEmp = employees.find(
    (e) => (user?.uid && (e.uid === user.uid || e.employeeId === user.uid)) || (user?.email && e.email?.toLowerCase() === user.email.toLowerCase())
  )

  const resolvedEmployeeName =
    currentEmp?.displayName ||
    currentEmp?.name ||
    userDoc?.displayName ||
    userDoc?.name ||
    user?.displayName ||
    (user?.email
      ? user.email
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Employee')

  const resolvedEmployeeEmail = user?.email || userDoc?.email || currentEmp?.email || ''
  const resolvedEmployeeId = user?.uid || userDoc?.uid || currentEmp?.uid || ''

  const loggedInEmployeeInitials = resolvedEmployeeName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'E'

  const [showAddModal, setShowAddModal] = useState(false)
  const [leaveType, setLeaveType] = useState('Casual Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState('')
  const [loadingLeave, setLoadingLeave] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null) // { type: 'cancel' | 'delete', request }
  const [actionLoading, setActionLoading] = useState(false)
  const singleDayOnly = isSingleDayLeaveType(leaveType)

  const currentMonthStr = new Date().toISOString().slice(0, 7) // "YYYY-MM"
  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

  const wfhPolicy = resolveEmployeeWfhPolicy(currentEmp || userDoc || {})

  // Real-time Firestore sync for leave requests
  useEffect(() => {
    setLoadingLeave(true)
    const unsub = onSnapshot(
      collection(db, 'leaveRequests'),
      (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), leaveId: d.id }))
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

  useEffect(() => {
    if (!wfhPolicy.leaveFormEnabled && leaveType === 'Work From Home') {
      setLeaveType('Casual Leave')
    }
  }, [wfhPolicy.leaveFormEnabled, leaveType])

  // Filter this employee's own leave requests using UID, Email, or Name for robust persistence across refreshes
  const myLeaveRequests = leaveRequests.filter((l) => {
    const uid = resolvedEmployeeId || user?.uid || ''
    if (uid && (l.employeeId === uid || l.uid === uid || l.employeeId === user?.uid)) return true
    if (
      resolvedEmployeeEmail &&
      l.employeeEmail &&
      l.employeeEmail.toLowerCase() === resolvedEmployeeEmail.toLowerCase()
    ) {
      return true
    }
    if (
      l.employeeName &&
      l.employeeName !== 'Team Staff' &&
      resolvedEmployeeName &&
      l.employeeName.toLowerCase() === resolvedEmployeeName.toLowerCase()
    ) {
      return true
    }
    if (
      l.employeeName === 'Team Staff' &&
      resolvedEmployeeEmail &&
      (!l.employeeEmail || l.employeeEmail.toLowerCase() === resolvedEmployeeEmail.toLowerCase())
    ) {
      return true
    }
    return false
  })

  const pendingRequests = myLeaveRequests.filter((l) => l.status === 'pending').length
  const approvedRequests = myLeaveRequests.filter((l) => l.status === 'approved')
  const rejectedRequests = myLeaveRequests.filter((l) => l.status === 'rejected')

  // Pending + approved count toward quota; rejected/cancelled do not
  const currentMonthRequests = myLeaveRequests.filter((l) => {
    if (l.status === 'rejected' || l.status === 'cancelled') return false
    return l.startDate && l.startDate.startsWith(currentMonthStr)
  })

  const currentMonthApproved = approvedRequests.filter((l) => {
    return l.startDate && l.startDate.startsWith(currentMonthStr)
  })

  // Dynamic month-wise calculation (1 Sick Leave & 1 Casual Leave per month)
  const usedCasualDaysThisMonth = currentMonthRequests
    .filter((l) => l.leaveType === 'Casual Leave' || l.leaveType === 'Annual Leave')
    .reduce((sum, l) => sum + (Number(l.days) || 1), 0)

  const usedSickDaysThisMonth = currentMonthRequests
    .filter((l) => l.leaveType === 'Sick Leave')
    .reduce((sum, l) => sum + (Number(l.days) || 1), 0)

  const remainingCasualDays = Math.max(0, 1 - usedCasualDaysThisMonth)
  const remainingSickDays = Math.max(0, 1 - usedSickDaysThisMonth)

  const employeeWfhFilter = {
    employeeId: resolvedEmployeeId,
    uid: user?.uid,
    employeeEmail: resolvedEmployeeEmail,
    employeeName: resolvedEmployeeName,
  }

  const wfhReferenceDate = startDate || new Date().toISOString().split('T')[0]
  const usedWfhDays = countUsedWfhDays(myLeaveRequests, employeeWfhFilter, wfhPolicy, wfhReferenceDate)
  const remainingWfhDays =
    wfhPolicy.leaveFormEnabled || wfhPolicy.clockInChoice
      ? Math.max(0, (Number(wfhPolicy.limit) || 1) - usedWfhDays)
      : null

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

    const stableEmployeeId = user?.uid || userDoc?.uid || currentEmp?.uid || resolvedEmployeeId
    const stableEmployeeEmail =
      user?.email || userDoc?.email || currentEmp?.email || resolvedEmployeeEmail || ''
    const stableEmployeeName = resolvedEmployeeName

    if (!stableEmployeeId && !stableEmployeeEmail) {
      setValidationError('Unable to identify your account. Please sign in again and retry.')
      return
    }

    const reqStartDate = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    reqStartDate.setHours(0, 0, 0, 0)

    const diffDays = Math.ceil((reqStartDate - today) / (1000 * 60 * 60 * 24))

    // Casual Leave requires at least 3 calendar days advance notice
    if (leaveType === 'Casual Leave' && diffDays < 3) {
      setValidationError(
        'Casual Leave can only be requested at least 3 days in advance. Please select a later date.'
      )
      return
    }

    // ─── 3-Day Advance Notice Rule ───
    // LOP, Sick Leave, Work From Home, and On Duty are exempt from the 3-day advance notice rule.
    const isUrgentLeave =
      leaveType === 'Sick Leave' ||
      leaveType === 'LOP (Loss of Pay)' ||
      leaveType === 'Work From Home' ||
      leaveType === 'On Duty'

    if (!isUrgentLeave && leaveType !== 'Casual Leave' && diffDays < 3) {
      setValidationError(
        'Standard leave must be requested at least 3 days in advance. For urgent situations, please select "Sick Leave", "LOP (Loss of Pay)", "Work From Home", or "On Duty".'
      )
      return
    }

    // WFH / Sick / Casual are always 1 day; LOP / On Duty allow a date range
    const finalEndDate = singleDayOnly ? startDate : (endDate || startDate)
    const daysCount = singleDayOnly
      ? 1
      : startDate && endDate
        ? Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1)
        : 1

    // Monthly Quota Validation: Maximum 1 Sick Leave & 1 Casual Leave per month
    if ((leaveType === 'Casual Leave' || leaveType === 'Annual Leave') && (usedCasualDaysThisMonth + daysCount > 1)) {
      setValidationError(
        `Monthly Casual Leave limit exceeded. Employees can take only 1 Casual Leave per month (${usedCasualDaysThisMonth}/1 used in ${currentMonthName}).`
      )
      return
    }

    if (leaveType === 'Sick Leave' && (usedSickDaysThisMonth + daysCount > 1)) {
      setValidationError(
        `Monthly Sick Leave limit exceeded. Employees can take only 1 Sick Leave per month (${usedSickDaysThisMonth}/1 used in ${currentMonthName}).`
      )
      return
    }

    let wfhStatus = 'pending'
    let wfhAutoApproved = false
    if (leaveType === 'Work From Home') {
      if (!wfhPolicy.leaveFormEnabled) {
        setValidationError(
          wfhPolicy.clockInChoice
            ? 'Weekly WFH is selected at Check In on Attendance — no leave request needed.'
            : 'Work From Home leave requests are not available for your account.'
        )
        return
      }
      const usedForRequest = countUsedWfhDays(
        myLeaveRequests,
        employeeWfhFilter,
        wfhPolicy,
        startDate
      )
      const wfhError = validateWfhRequest(wfhPolicy, usedForRequest, daysCount)
      if (wfhError) {
        setValidationError(wfhError)
        return
      }
      wfhStatus = getWfhLeaveStatus(wfhPolicy, { createdByAdmin: false })
      wfhAutoApproved = wfhStatus === 'approved'
    }

    const leaveData = {
      employeeName: stableEmployeeName,
      employeeId: stableEmployeeId || '',
      employeeEmail: stableEmployeeEmail,
      leaveType,
      startDate,
      endDate: finalEndDate,
      days: daysCount,
      reason: reason.trim(),
      ...(leaveType === 'Work From Home'
        ? {
            status: wfhStatus,
            autoApproved: wfhAutoApproved,
            ...(wfhAutoApproved ? { reviewedBy: 'WFH Policy' } : {}),
          }
        : {}),
    }

    try {
      const created = await createLeaveRequest(leaveData)
      addLeaveRequest(created)

      setLeaveType('Casual Leave')
      setStartDate('')
      setEndDate('')
      setReason('')
      setValidationError('')
      setShowAddModal(false)
    } catch (err) {
      console.error('Failed to create leave request:', err)
      setValidationError(
        err?.message?.includes('undefined')
          ? 'Failed to submit leave request due to invalid data. Please try again.'
          : 'Failed to submit leave request. Please try again.'
      )
    }
  }

  const isOwnRequest = (req) => {
    if (!req) return false
    const uid = resolvedEmployeeId || user?.uid || ''
    if (uid && (req.employeeId === uid || req.uid === uid || req.employeeId === user?.uid)) return true
    if (
      resolvedEmployeeEmail &&
      req.employeeEmail &&
      req.employeeEmail.toLowerCase() === resolvedEmployeeEmail.toLowerCase()
    ) {
      return true
    }
    if (
      req.employeeName &&
      req.employeeName !== 'Team Staff' &&
      resolvedEmployeeName &&
      req.employeeName.toLowerCase() === resolvedEmployeeName.toLowerCase()
    ) {
      return true
    }
    return false
  }

  const isOwnPendingRequest = (req) => isOwnRequest(req) && req.status === 'pending'

  /** Employees may delete their own pending or cancelled requests only */
  const canDeleteOwnRequest = (req) =>
    isOwnRequest(req) && (req.status === 'pending' || req.status === 'cancelled')

  const handleConfirmAction = async () => {
    if (!confirmAction?.request) return
    const req = confirmAction.request

    if (confirmAction.type === 'cancel') {
      if (!isOwnPendingRequest(req)) {
        setConfirmAction(null)
        return
      }
    } else if (confirmAction.type === 'delete') {
      if (!canDeleteOwnRequest(req)) {
        setConfirmAction(null)
        return
      }
    } else {
      setConfirmAction(null)
      return
    }

    setActionLoading(true)
    try {
      if (confirmAction.type === 'cancel') {
        const extras = {
          cancelledBy: resolvedEmployeeName,
          cancelledAt: new Date().toISOString(),
        }
        updateLeaveStatus(req.leaveId, 'cancelled', extras)
        await updateLeaveStatusInDb(req.leaveId, 'cancelled', extras)
      } else if (confirmAction.type === 'delete') {
        await deleteLeaveRequestFromDb(req.leaveId)
        removeLeaveRequest(req.leaveId)
      }
    } catch (err) {
      console.error('Failed to update leave request:', err)
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'approved') return { variant: 'success', label: 'Granted' }
    if (status === 'rejected') return { variant: 'danger', label: 'Declined' }
    if (status === 'cancelled') return { variant: 'neutral', label: 'Cancelled' }
    return { variant: 'warning', label: 'Pending Review' }
  }

  return (
    <div className="space-y-6">
      {/* Header & Sub Nav */}
      <div className="space-y-4">
        <PageHeader
          title="Monthly Leave & PTO Management"
          description={`Track monthly leave requests. Each employee can take 1 Sick Leave & 1 Casual Leave per month (${currentMonthName}).`}
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
                {approvedRequests[0].leaveType} ({approvedRequests[0].startDate === approvedRequests[0].endDate || Number(approvedRequests[0].days) === 1
                  ? `${approvedRequests[0].startDate} (1 Day)`
                  : `${approvedRequests[0].startDate} to ${approvedRequests[0].endDate}`}) for {approvedRequests[0].employeeName} has been approved
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

      {/* Monthly Policy Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/30 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Monthly Leave Allowance Policy ({currentMonthName})
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              Each employee is allocated <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">1 Sick Leave</strong> and <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">1 Casual Leave</strong> per month. Leave tracking is calculated on a month-wise basis.
            </p>
          </div>
        </div>
        <Badge variant="indigo">Monthly Quota</Badge>
      </div>

      {/* Monthly PTO Balance Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Monthly Casual Leave
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {remainingCasualDays} {remainingCasualDays === 1 ? 'Day' : 'Days'} Remaining
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {usedCasualDaysThisMonth} of 1 Day Used ({currentMonthName})
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Monthly Sick Leave
            </span>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {remainingSickDays} {remainingSickDays === 1 ? 'Day' : 'Days'} Remaining
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {usedSickDaysThisMonth} of 1 Day Used ({currentMonthName})
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Approvals
            </span>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingRequests} Requests</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Awaiting review</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between border-slate-200 dark:border-slate-800/80">
          <div>
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Approved ({currentMonthName})
            </span>
            <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">{currentMonthApproved.length} Granted</p>
            <p className="text-[10px] text-slate-400 mt-0.5">This month total</p>
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
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {myLeaveRequests.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No leave requests submitted yet. Click "Request Leave" above to apply.
                </td>
              </tr>
            ) : (
              myLeaveRequests.map((req) => {
                const statusBadge = getStatusBadge(req.status)
                const canCancel = isOwnPendingRequest(req)
                const canDelete = canDeleteOwnRequest(req)
                return (
                  <tr key={req.leaveId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-slate-700 dark:text-slate-300">
                    <td className="p-4 text-slate-800 dark:text-slate-300 font-medium">{req.leaveType}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400">
                      {req.startDate === req.endDate || Number(req.days) === 1
                        ? `${req.startDate} (1 Day)`
                        : `${req.startDate} to ${req.endDate} (${req.days} days)`}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">{req.reason}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                        {req.reviewedBy && req.status !== 'pending' && req.status !== 'cancelled' && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            by {req.reviewedBy}
                          </span>
                        )}
                        {req.status === 'cancelled' && req.cancelledBy && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            by {req.cancelledBy}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {canCancel || canDelete ? (
                        <div className="flex items-center justify-end gap-2">
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'cancel', request: req })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title="Cancel Request"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Cancel Request
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setConfirmAction({ type: 'delete', request: req })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
                              title="Delete Request"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Cancel / Delete Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl bg-white dark:bg-[#181C27]">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  confirmAction.type === 'delete'
                    ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {confirmAction.type === 'delete' ? <Trash2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {confirmAction.type === 'delete' ? 'Delete Leave Request?' : 'Cancel Leave Request?'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {confirmAction.type === 'delete'
                    ? `This will permanently remove your ${confirmAction.request.leaveType} request for ${confirmAction.request.startDate}. This cannot be undone.`
                    : `Your ${confirmAction.request.leaveType} request for ${confirmAction.request.startDate} will be marked as Cancelled. It will not count against your leave balance.`}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => !actionLoading && setConfirmAction(null)}
                className="w-1/3"
                disabled={actionLoading}
              >
                Keep Request
              </Button>
              <Button
                type="button"
                variant={confirmAction.type === 'delete' ? 'danger' : 'primary'}
                onClick={handleConfirmAction}
                className="w-2/3"
                disabled={actionLoading}
                icon={confirmAction.type === 'delete' ? Trash2 : Ban}
              >
                {actionLoading
                  ? 'Please wait…'
                  : confirmAction.type === 'delete'
                    ? 'Delete Permanently'
                    : 'Confirm Cancel'}
              </Button>
            </div>
          </Card>
        </div>
      )}

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
                    const nextType = e.target.value
                    setLeaveType(nextType)
                    setValidationError('')
                    // Collapse any prior range when switching to a single-day leave type
                    if (isSingleDayLeaveType(nextType) && startDate) {
                      setEndDate(startDate)
                    }
                    // Casual Leave requires 3 calendar days advance — clear too-early dates
                    if (nextType === 'Casual Leave' && startDate) {
                      const today = new Date()
                      today.setHours(0, 0, 0, 0)
                      const cursor = new Date(today)
                      cursor.setDate(cursor.getDate() + 3)
                      const y = cursor.getFullYear()
                      const m = String(cursor.getMonth() + 1).padStart(2, '0')
                      const d = String(cursor.getDate()).padStart(2, '0')
                      const minCasual = `${y}-${m}-${d}`
                      if (startDate < minCasual) {
                        setStartDate('')
                        setEndDate('')
                        setValidationError(
                          `Casual Leave can only be selected at least 3 days in advance. Earliest available date is ${minCasual}.`
                        )
                      }
                    }
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Casual Leave">Casual Leave (1 Day / Month · 3 days advance)</option>
                  <option value="Sick Leave">Sick Leave (1 Day / Month)</option>
                  {wfhPolicy.leaveFormEnabled && (
                    <option value="Work From Home">
                      Work From Home ({getWfhAllowanceLabel(wfhPolicy)}) — needs approval
                    </option>
                  )}
                  <option value="On Duty">On Duty (outdoor / official work)</option>
                  <option value="LOP (Loss of Pay)">LOP (Loss of Pay)</option>
                </select>
                {wfhPolicy.leaveFormEnabled && leaveType === 'Work From Home' && remainingWfhDays !== null && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Remaining this month: {remainingWfhDays} of {wfhPolicy.limit} day(s). Admin approval required.
                  </p>
                )}
                {wfhPolicy.clockInChoice && remainingWfhDays !== null && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Weekly WFH ({remainingWfhDays} of {wfhPolicy.limit} remaining this week) — choose WFH or Office when you Check In. No leave request needed.
                  </p>
                )}
                {wfhPolicy.mode === 'full' && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    You are on Full WFH — no leave request is required.
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {singleDayOnly ? 'Select Leave Date' : 'Select Date Range'}
                </label>
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
