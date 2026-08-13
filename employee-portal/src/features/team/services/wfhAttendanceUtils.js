/**
 * Location-gated clock-in helpers with per-employee WFH exceptions.
 */
import {
  resolveEmployeeWfhPolicy,
  countUsedWfhDays,
} from './wfhPolicyUtils'
import { getOfficeLocation } from './teamService'

/** Set true to require office GPS / weekly WFH clock-in choice again. */
export const LOCATION_GATE_ENABLED = true

// #region agent log
const agentDbg = (hypothesisId, location, message, data) => {
  const payload = JSON.stringify({ sessionId: '98b944', runId: 'pre-fix', hypothesisId, location, message, data, timestamp: Date.now() })
  fetch('http://127.0.0.1:7493/ingest/c3ff692f-1cdd-437c-bb23-67bdbbc19c12', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '98b944' }, body: payload }).catch(() => {})
  fetch('/__agent_debug_log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {})
}
// #endregion

const toDateKey = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const matchesEmployee = (leave, filter = {}) => {
  const { employeeId, employeeEmail, employeeName, uid } = filter
  if (employeeId && (leave.employeeId === employeeId || leave.employeeId === uid)) return true
  if (uid && leave.employeeId === uid) return true
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

const dateInRange = (dateStr, startDate, endDate) => {
  if (!dateStr || !startDate) return false
  const end = endDate || startDate
  return dateStr >= startDate && dateStr <= end
}

/**
 * True if employee has an approved WFH leave covering dateStr.
 */
export const hasApprovedWfhToday = (leaveRequests, employeeFilter, dateStr) => {
  const day = dateStr || toDateKey()
  const list = Array.isArray(leaveRequests) ? leaveRequests : []
  return list.some(
    (l) =>
      l.leaveType === 'Work From Home' &&
      l.status === 'approved' &&
      matchesEmployee(l, employeeFilter) &&
      dateInRange(day, l.startDate, l.endDate)
  )
}

/**
 * Weekly employees choose WFH vs Office at clock-in (no leave form).
 * Prompt only when they still have remaining weekly days and no WFH leave today.
 */
export const getWeeklyClockInPromptState = ({
  emp,
  leaveRequests,
  dateStr,
  employeeFilter,
} = {}) => {
  const day = dateStr || toDateKey()
  const wfh = resolveEmployeeWfhPolicy(emp || {})
  const filter = employeeFilter || {
    employeeId: emp?.uid || emp?.employeeId,
    uid: emp?.uid || emp?.employeeId,
    employeeEmail: emp?.email,
    employeeName: emp?.displayName || emp?.name,
  }

  if (!wfh.clockInChoice) {
    return {
      showPrompt: false,
      remaining: 0,
      limit: wfh.limit,
      alreadyWfhToday: false,
    }
  }

  const alreadyWfhToday = hasApprovedWfhToday(leaveRequests, filter, day)
  const used = countUsedWfhDays(leaveRequests, filter, wfh, day)
  const remaining = Math.max(0, (Number(wfh.limit) || 1) - used)

  return {
    showPrompt: !alreadyWfhToday && remaining > 0,
    remaining,
    limit: wfh.limit,
    alreadyWfhToday,
  }
}

/**
 * Decide whether office GPS is required for clock-in today.
 */
export const resolveClockInLocationPolicy = ({ emp, leaveRequests, dateStr, employeeFilter } = {}) => {
  const day = dateStr || toDateKey()
  const wfh = resolveEmployeeWfhPolicy(emp || {})
  const filter = employeeFilter || {
    employeeId: emp?.uid || emp?.employeeId,
    uid: emp?.uid || emp?.employeeId,
    employeeEmail: emp?.email,
    employeeName: emp?.displayName || emp?.name,
  }

  if (wfh.mode === 'full') {
    return {
      requireOfficeLocation: false,
      wfhExempt: true,
      reason: 'Full WFH — location not required',
    }
  }

  if (
    (wfh.mode === 'weekly' || wfh.mode === 'monthly') &&
    hasApprovedWfhToday(leaveRequests, filter, day)
  ) {
    return {
      requireOfficeLocation: false,
      wfhExempt: true,
      reason:
        wfh.mode === 'monthly'
          ? 'Approved monthly WFH today — location not required'
          : 'Approved weekly WFH today — location not required',
    }
  }

  return {
    requireOfficeLocation: true,
    wfhExempt: false,
    reason: 'Must clock in from the office location',
  }
}

/** Haversine distance in meters */
export const distanceMeters = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (deg * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export const isWithinOfficeRadius = (userLat, userLng, office) => {
  if (
    userLat == null ||
    userLng == null ||
    office?.lat == null ||
    office?.lng == null
  ) {
    return false
  }
  const dist = distanceMeters(userLat, userLng, office.lat, office.lng)
  const radius = Math.max(50, Number(office.radiusMeters) || 200)
  return dist <= radius
}

/**
 * Browser geolocation promise
 * @returns {Promise<{ ok: true, lat: number, lng: number } | { ok: false, error: string }>}
 */
export const getCurrentPositionCoords = () =>
  new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ ok: false, error: 'Geolocation is not supported on this device.' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        let message = 'Unable to get your location.'
        if (err?.code === 1) message = 'Location permission denied. Allow location access to clock in at the office.'
        if (err?.code === 2) message = 'Location unavailable. Try again near the office.'
        if (err?.code === 3) message = 'Location request timed out. Try again.'
        // #region agent log
        agentDbg('C', 'wfhAttendanceUtils.js:getCurrentPositionCoords', 'employee GPS error', { code: err?.code, message })
        // #endregion
        resolve({ ok: false, error: message })
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })

/**
 * Full pre-check before clock-in.
 */
export const prepareClockInGate = async ({ emp, leaveRequests, dateStr, employeeFilter } = {}) => {
  if (!LOCATION_GATE_ENABLED) {
    return {
      ok: true,
      requireOfficeLocation: false,
      wfhExempt: false,
      locationVerified: false,
      reason: 'Location check temporarily disabled',
      coords: null,
    }
  }

  const policy = resolveClockInLocationPolicy({ emp, leaveRequests, dateStr, employeeFilter })

  if (!policy.requireOfficeLocation) {
    return {
      ok: true,
      requireOfficeLocation: false,
      wfhExempt: true,
      locationVerified: false,
      reason: policy.reason,
      coords: null,
    }
  }

  const office = await getOfficeLocation()
  if (office.lat == null || office.lng == null) {
    // #region agent log
    agentDbg('A', 'wfhAttendanceUtils.js:prepareClockInGate', 'office lat/lng missing after fetch', { officeLat: office?.lat, officeLng: office?.lng, radius: office?.radiusMeters, latType: typeof office?.lat, lngType: typeof office?.lng })
    // #endregion
    return {
      ok: false,
      requireOfficeLocation: true,
      error: 'Office location is not configured. Contact your administrator.',
    }
  }

  const coords = await getCurrentPositionCoords()
  if (!coords.ok) {
    return {
      ok: false,
      requireOfficeLocation: true,
      error: coords.error,
    }
  }

  const dist = distanceMeters(coords.lat, coords.lng, office.lat, office.lng)
  const distIfSwapped = distanceMeters(coords.lng, coords.lat, office.lat, office.lng)
  const radius = Math.max(50, Number(office.radiusMeters) || 200)
  const within = dist <= radius
  const withinWithAccuracy = dist <= radius + (Number(coords.accuracy) || 0)
  // #region agent log
  agentDbg('C', 'wfhAttendanceUtils.js:prepareClockInGate', 'geofence comparison', { officeLat: office.lat, officeLng: office.lng, radius, userLat: coords.lat, userLng: coords.lng, accuracy: coords.accuracy, dist, distIfSwapped, within, withinWithAccuracy, userLatType: typeof coords.lat, officeLatType: typeof office.lat })
  // #endregion

  if (!isWithinOfficeRadius(coords.lat, coords.lng, office)) {
    return {
      ok: false,
      requireOfficeLocation: true,
      error: `You must be at the office to clock in (about ${Math.round(dist)}m away; allowed radius ${office.radiusMeters}m).`,
      coords,
    }
  }

  return {
    ok: true,
    requireOfficeLocation: true,
    wfhExempt: false,
    locationVerified: true,
    reason: 'Inside office geofence',
    coords: { lat: coords.lat, lng: coords.lng },
    office,
  }
}
