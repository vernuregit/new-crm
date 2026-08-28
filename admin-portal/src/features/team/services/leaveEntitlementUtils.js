export const LOP_LEAVE_TYPE = 'LOP (Loss of Pay)'
export const PERMISSION_LEAVE_TYPE = 'Permission'
export const DEFAULT_PERMISSION_HOURS = 4

export const DEFAULT_LEAVE_LIMITS = {
  casual: 1,
  sick: 1,
  wfh: 1,
}

const BUCKET_FOR_TYPE = {
  'Casual Leave': 'casual',
  'Annual Leave': 'casual',
  'Sick Leave': 'sick',
  'Work From Home': 'wfh',
}

const PAID_TYPE_FOR_BUCKET = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  wfh: 'Work From Home',
}

export const expandLeaveDateRange = (startDate, endDate) => {
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

export const resolveLeaveLimits = (employeeDoc) => {
  const raw = employeeDoc?.leaveLimits || {}
  const num = (value, fallback) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return fallback
    return Math.max(0, Math.floor(n))
  }
  return {
    casual: num(raw.casual, DEFAULT_LEAVE_LIMITS.casual),
    sick: num(raw.sick, DEFAULT_LEAVE_LIMITS.sick),
    wfh: num(raw.wfh, DEFAULT_LEAVE_LIMITS.wfh),
  }
}

const parseTimeToMinutes = (time) => {
  if (!time || typeof time !== 'string') return NaN
  const [h, m] = time.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
  return h * 60 + m
}

export const hoursBetween = (startTime, endTime) => {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return Math.round(((end - start) / 60) * 100) / 100
}

export const resolvePermissionHours = (employeeDoc) => {
  const n = Number(employeeDoc?.leaveLimits?.permissionHours)
  if (Number.isFinite(n) && n >= 0) return n
  return DEFAULT_PERMISSION_HOURS
}

export const isPermissionLeave = (leave) => {
  const type = leave?.requestedLeaveType || leave?.leaveType
  return type === PERMISSION_LEAVE_TYPE
}

export const getPermissionHours = (leave) => {
  const stored = Number(leave?.hours)
  if (Number.isFinite(stored) && stored > 0) return stored
  return hoursBetween(leave?.startTime, leave?.endTime)
}

export const countUsedPermissionHours = (
  leaveRequests,
  employeeFilter,
  monthStr,
  { excludeLeaveId } = {}
) => {
  if (!monthStr) return 0
  const list = Array.isArray(leaveRequests) ? leaveRequests : []
  const total = list.reduce((sum, leave) => {
    if (excludeLeaveId && (leave.leaveId === excludeLeaveId || leave.id === excludeLeaveId)) return sum
    if (leave?.status !== 'approved' && leave?.status !== 'pending') return sum
    if (!leaveMatchesEmployeeFilter(leave, employeeFilter)) return sum
    if (!isPermissionLeave(leave)) return sum
    const date = leave.startDate || leave.endDate || ''
    if (!date.startsWith(monthStr)) return sum
    return sum + getPermissionHours(leave)
  }, 0)
  return Math.round(total * 100) / 100
}

export const formatLeaveDuration = (req) => {
  if (!req) return ''
  if (isPermissionLeave(req)) {
    const hours = getPermissionHours(req)
    const hrsLabel = hours === 1 ? '1 hr' : `${hours} hrs`
    const date = req.startDate || ''
    if (req.startTime && req.endTime) return `${date} · ${req.startTime}–${req.endTime} (${hrsLabel})`
    return `${date} (${hrsLabel})`
  }
  if (req.startDate === req.endDate || Number(req.days) === 1) {
    return `${req.startDate} (1 Day)`
  }
  return `${req.startDate} to ${req.endDate} (${req.days} days)`
}

export const getRequestedLeaveType = (leave) =>
  leave?.requestedLeaveType || leave?.leaveType || 'Leave'

export const getLeaveBucket = (leaveType) => BUCKET_FOR_TYPE[leaveType] || null

export const leaveMatchesEmployeeFilter = (leave, filter = {}) => {
  const { employeeId, employeeEmail, employeeName, uid } = filter
  if (!leave) return false
  if (employeeId && (leave.employeeId === employeeId || leave.uid === employeeId)) return true
  if (uid && (leave.employeeId === uid || leave.uid === uid)) return true
  if (employeeEmail && leave.employeeEmail?.toLowerCase() === employeeEmail.toLowerCase()) return true
  if (
    employeeName &&
    employeeName !== 'Team Staff' &&
    leave.employeeName?.toLowerCase() === employeeName.toLowerCase()
  ) {
    return true
  }
  return false
}

const createdAtMs = (value) => {
  if (!value) return 0
  if (typeof value === 'number') return value
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

const isActiveLeave = (leave) => leave?.status !== 'rejected' && leave?.status !== 'cancelled'

export const countUsedPaidDays = (
  leaveRequests,
  employeeFilter,
  bucket,
  monthStr,
  { includePending = true, excludeLeaveId } = {}
) => {
  if (!bucket || !monthStr) return 0
  const list = Array.isArray(leaveRequests) ? leaveRequests : []
  return list.reduce((sum, leave) => {
    if (excludeLeaveId && (leave.leaveId === excludeLeaveId || leave.id === excludeLeaveId)) return sum
    if (!isActiveLeave(leave)) return sum
    if (!includePending && leave.status !== 'approved') return sum
    if (leave.status !== 'approved' && leave.status !== 'pending') return sum
    if (!leaveMatchesEmployeeFilter(leave, employeeFilter)) return sum
    if (getLeaveBucket(getRequestedLeaveType(leave)) !== bucket) return sum
    const days = expandLeaveDateRange(leave.startDate, leave.endDate || leave.startDate).filter((d) =>
      d.startsWith(monthStr)
    )
    return sum + days.length
  }, 0)
}

export const applyLopConversion = ({
  requestedType,
  startDate,
  endDate,
  days,
  leaveRequests,
  employeeFilter,
  limits,
  excludeLeaveId,
} = {}) => {
  const requestedLeaveType = requestedType || 'Leave'
  const bucket = getLeaveBucket(requestedLeaveType)
  if (!bucket) {
    return { leaveType: requestedLeaveType, requestedLeaveType, convertedToLop: false }
  }
  const monthStr = (startDate || '').slice(0, 7)
  const used = countUsedPaidDays(leaveRequests, employeeFilter, bucket, monthStr, {
    includePending: true,
    excludeLeaveId,
  })
  const limit = Number(limits?.[bucket]) || 0
  const rangeDays = expandLeaveDateRange(startDate, endDate || startDate).filter((d) =>
    d.startsWith(monthStr)
  )
  const daysCount = rangeDays.length || Number(days) || 1
  if (used + daysCount > limit) {
    return {
      leaveType: LOP_LEAVE_TYPE,
      requestedLeaveType,
      convertedToLop: true,
    }
  }
  return { leaveType: requestedLeaveType, requestedLeaveType, convertedToLop: false }
}

export const classifyApprovedLeaveByDate = (leaveRequests, employeeFilter, limits) => {
  const map = {}
  const list = (Array.isArray(leaveRequests) ? leaveRequests : []).filter(
    (leave) =>
      leave.status === 'approved' && leaveMatchesEmployeeFilter(leave, employeeFilter)
  )

  const dayEntries = []
  list.forEach((leave) => {
    const requested = getRequestedLeaveType(leave)
    expandLeaveDateRange(leave.startDate, leave.endDate || leave.startDate).forEach((date) => {
      dayEntries.push({
        date,
        leave,
        requested,
        createdAt: createdAtMs(leave.createdAt),
        leaveId: leave.leaveId || leave.id || '',
      })
    })
  })

  dayEntries.forEach((entry) => {
    if (getLeaveBucket(entry.requested)) return
    if (entry.requested === 'On Duty' || entry.leave.leaveType === 'On Duty') return
    const type = entry.leave.leaveType === LOP_LEAVE_TYPE || entry.requested === LOP_LEAVE_TYPE
      ? LOP_LEAVE_TYPE
      : entry.requested
    const status = type === LOP_LEAVE_TYPE ? 'lop' : 'leave'
    if (map[entry.date]?.status === 'lop') return
    map[entry.date] = {
      status,
      leaveType: type,
      requestedLeaveType: entry.requested,
      convertedToLop: type === LOP_LEAVE_TYPE,
    }
  })

  const byMonthBucket = {}
  dayEntries.forEach((entry) => {
    const bucket = getLeaveBucket(entry.requested)
    if (!bucket) return
    const key = `${entry.date.slice(0, 7)}:${bucket}`
    if (!byMonthBucket[key]) byMonthBucket[key] = []
    byMonthBucket[key].push(entry)
  })

  Object.entries(byMonthBucket).forEach(([key, entries]) => {
    const bucket = key.split(':')[1]
    const limit = Number(limits?.[bucket]) || 0
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
      return String(a.leaveId).localeCompare(String(b.leaveId))
    })
    entries.forEach((entry, index) => {
      const over = index >= limit
      const paidType = PAID_TYPE_FOR_BUCKET[bucket]
      const status = over ? 'lop' : bucket
      const leaveType = over ? LOP_LEAVE_TYPE : paidType
      if (map[entry.date]?.status === 'lop') return
      map[entry.date] = {
        status,
        leaveType,
        requestedLeaveType: entry.requested,
        convertedToLop: over,
      }
    })
  })

  return map
}

export const countClassifiedLopDays = (classifiedByDate, monthStr) =>
  Object.entries(classifiedByDate || {}).filter(
    ([date, info]) =>
      (!monthStr || date.startsWith(monthStr)) && (info?.status === 'lop' || info?.leaveType === LOP_LEAVE_TYPE)
  ).length

export const formatLeaveTypeLabel = (leave, classifiedType) => {
  const effective = classifiedType || leave?.leaveType
  const converted =
    leave?.convertedToLop ||
    effective === LOP_LEAVE_TYPE ||
    classifiedType === LOP_LEAVE_TYPE
  if (converted) {
    const requested = leave?.requestedLeaveType
    if (requested && requested !== LOP_LEAVE_TYPE) {
      return `LOP (unpaid) · ${requested}`
    }
    return 'LOP (unpaid)'
  }
  return effective || 'Leave'
}

export const attendanceStatusDotClass = (status) => {
  if (status === 'present') return 'bg-[#22C55E]'
  if (status === 'wfh') return 'bg-[#06B6D4]'
  if (status === 'casual') return 'bg-[#A855F7]'
  if (status === 'sick') return 'bg-[#F97316]'
  if (status === 'holiday') return 'bg-[#EAB308]'
  if (status === 'lop') return 'bg-[#EC4899]'
  if (status === 'leave') return 'bg-[#A855F7]'
  return 'bg-[#EF4444]'
}

export const attendanceStatusDotSizeClass = () => 'w-1.5 h-1.5'

export const attendanceStatusDayClass = (status) => {
  if (status === 'holiday') return 'bg-[#EAB308]/20 text-[#EAB308] font-bold'
  if (status === 'lop') return 'bg-[#EC4899]/15 text-[#EC4899] font-bold'
  if (status === 'wfh') return 'bg-[#06B6D4]/20 text-[#06B6D4] font-bold'
  if (status === 'casual') return 'bg-[#A855F7]/15 text-[#A855F7] font-bold'
  if (status === 'sick') return 'bg-[#F97316]/20 text-[#F97316] font-bold'
  if (status === 'leave') return 'bg-[#A855F7]/15 text-[#A855F7] font-bold'
  if (status === 'present') return 'text-[#22C55E] font-bold'
  if (status === 'absent') return 'text-[#EF4444] font-bold'
  return ''
}

export const attendanceStatusTooltip = (status, leaveType, holidayName) => {
  if (status === 'holiday') return holidayName || 'Holiday'
  if (status === 'lop') return 'LOP (Loss of Pay)'
  if (status === 'wfh') return 'Work From Home'
  if (status === 'casual') return 'Casual Leave'
  if (status === 'sick') return 'Sick Leave'
  if (status === 'leave') return leaveType || 'Leave'
  return null
}
