import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { upsertAttendanceLog, getTodayAttendanceLog } from '../services/attendanceService'
import { useUserStore } from '../../../stores/userStore'

// Office hours constants
export const OFFICE_START_HOUR = 10
export const OFFICE_START_MINUTE = 30
export const OFFICE_END_HOUR = 19
export const OFFICE_END_MINUTE = 0

// 8.5-hour workday in seconds (10:30 AM – 7:00 PM = 8h 30m)
export const WORKDAY_SECONDS = 8.5 * 3600

/**
 * Returns a "YYYY-MM-DD" string for today (local date).
 */
function todayDateStr() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Convert accumulated seconds to a human-readable "Xh Ym" string.
 */
function secToHrsStr(totalSec) {
  const hrs = Math.floor(totalSec / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  return `${hrs}h ${mins}m`
}

/**
 * Resolves user metadata (uid, displayName, departmentName) from passed argument or useUserStore.
 */
function resolveUserMeta(userMeta) {
  if (userMeta && userMeta.uid) return userMeta
  try {
    const { user, userDoc } = useUserStore.getState()
    const uid = userDoc?.uid || user?.uid
    const displayName = userDoc?.displayName || user?.displayName || 'Employee'
    const departmentName = userDoc?.departmentName || ''
    return { uid, displayName, departmentName }
  } catch (e) {
    return userMeta || {}
  }
}

export const useTeamStore = create(
  persist(
    (set, get) => ({
      employees: [],
      departments: [],
      leaveRequests: [],

      // Active user tracking
      currentUserId: null,

      // Clock-in state
      clockedIn: false,
      clockInTime: null,
      clockInTimestamp: null,
      clockOutTime: null,
      isOnBreak: false,
      breakStartTime: null,
      accumulatedBreakSeconds: 0,
      accumulatedWorkSeconds: 0,
      todayShiftLogs: [],

      // Extra/overtime state – activated manually after normal hours end
      isInExtraTime: false,
      extraTimeStart: null,
      accumulatedExtraSeconds: 0,
      extraTimeLogs: [],

      // Overtime records stored per-day (for admin visibility)
      overtimeRecords: [],

      // Date tracking for auto-reset
      lastWorkDate: null,

      attendanceStats: {
        totalDays: 23,
        presentDays: 21,
        absentDays: 2,
        attendancePercentage: 91,
        avgHours: '7h 45m',
        avgCheckIn: '09:15 AM',
        avgArrival: '09:10 AM',
        avgCheckOut: '06:15 PM',
      },
      loading: false,

      setEmployees: (employees) => set({ employees }),
      setDepartments: (departments) => set({ departments }),
      setLeaveRequests: (leaveRequests) => set({ leaveRequests }),
      setLoading: (loading) => set({ loading }),

      addEmployee: (newEmp) =>
        set((state) => ({
          employees: [
            {
              uid: `emp_${Date.now()}`,
              status: 'active',
              joinedAt: new Date().toISOString().split('T')[0],
              utilizationRate: 85,
              skills: newEmp.skills || ['General'],
              ...newEmp,
            },
            ...state.employees,
          ],
        })),

      deleteEmployee: (uid) =>
        set((state) => ({
          employees: state.employees.filter((e) => e.uid !== uid && e.employeeId !== uid),
        })),

      addLeaveRequest: (newLeave) =>
        set((state) => ({
          leaveRequests: [
            {
              leaveId: `leave_${Date.now()}`,
              status: 'pending',
              ...newLeave,
            },
            ...state.leaveRequests,
          ],
        })),

      updateLeaveStatus: (leaveId, newStatus) =>
        set((state) => ({
          leaveRequests: state.leaveRequests.map((l) =>
            l.leaveId === leaveId ? { ...l, status: newStatus } : l
          ),
        })),

      /**
       * Resets attendance state (e.g. on logout or user switch).
       */
      resetAttendanceState: () =>
        set({
          currentUserId: null,
          clockedIn: false,
          clockInTime: null,
          clockInTimestamp: null,
          clockOutTime: null,
          isOnBreak: false,
          breakStartTime: null,
          accumulatedBreakSeconds: 0,
          accumulatedWorkSeconds: 0,
          todayShiftLogs: [],
          isInExtraTime: false,
          extraTimeStart: null,
          accumulatedExtraSeconds: 0,
          extraTimeLogs: [],
          overtimeRecords: [],
          lastWorkDate: null,
        }),

      /**
       * Loads today's attendance state for a specific employee from Firestore.
       * @param {string} uid
       */
      loadUserAttendance: async (uid) => {
        if (!uid) {
          get().resetAttendanceState()
          return
        }

        set({ currentUserId: uid })

        try {
          const todayLog = await getTodayAttendanceLog(uid)
          if (todayLog && todayLog.date === todayDateStr()) {
            set({
              clockedIn: Boolean(todayLog.clockedIn),
              clockInTime: todayLog.clockInTime || null,
              clockInTimestamp: todayLog.clockInTimestamp || null,
              clockOutTime: todayLog.clockOutTime || null,
              isOnBreak: Boolean(todayLog.isOnBreak),
              breakStartTime: todayLog.breakStartTime || null,
              accumulatedBreakSeconds: todayLog.accumulatedBreakSeconds || 0,
              accumulatedWorkSeconds: todayLog.regularSeconds ?? todayLog.accumulatedWorkSeconds ?? 0,
              todayShiftLogs: todayLog.todayShiftLogs || todayLog.shiftLogs || [],
              isInExtraTime: Boolean(todayLog.isInExtraTime),
              extraTimeStart: todayLog.extraTimeStart || null,
              accumulatedExtraSeconds: todayLog.extraSeconds ?? todayLog.accumulatedExtraSeconds ?? 0,
              extraTimeLogs: todayLog.extraTimeLogs || [],
              lastWorkDate: todayLog.date || todayDateStr(),
            })
          } else {
            // No record for today yet: set un-clocked defaults for this user
            set({
              clockedIn: false,
              clockInTime: null,
              clockInTimestamp: null,
              clockOutTime: null,
              isOnBreak: false,
              breakStartTime: null,
              accumulatedBreakSeconds: 0,
              accumulatedWorkSeconds: 0,
              todayShiftLogs: [],
              isInExtraTime: false,
              extraTimeStart: null,
              accumulatedExtraSeconds: 0,
              extraTimeLogs: [],
              lastWorkDate: todayDateStr(),
            })
          }
        } catch (err) {
          console.error('[teamStore] Error loading user attendance from Firestore:', err)
        }
      },

      /**
       * Auto clock-out at 7:00 PM. Called by the widget's useEffect.
       * @param {object} userMeta - { uid, displayName, departmentName }
       */
      autoClockOutAtEndOfDay: (userMeta = {}) => {
        const meta = resolveUserMeta(userMeta)
        const state = get()
        if (!state.clockedIn) return

        const now = new Date()
        const endTime = new Date(now)
        endTime.setHours(OFFICE_END_HOUR, OFFICE_END_MINUTE, 0, 0)

        const endTs = endTime.getTime()
        const timeStr = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        const sessionMs = endTs - state.clockInTimestamp
        const sessionSeconds = Math.max(0, Math.floor(sessionMs / 1000))
        const netSeconds = Math.max(0, sessionSeconds - state.accumulatedBreakSeconds)
        const totalRegularSeconds = state.accumulatedWorkSeconds + netSeconds

        const record = {
          id: `ot_${Date.now()}`,
          date: todayDateStr(),
          regularSeconds: totalRegularSeconds,
          extraSeconds: state.accumulatedExtraSeconds,
          clockIn: state.clockInTime,
          clockOut: timeStr,
          autoClockOut: true,
        }

        const updatedLogs = [
          {
            id: `log_${Date.now()}`,
            type: 'auto_clock_out',
            label: 'Auto Clocked Out (EOD)',
            time: timeStr,
            timestamp: endTs,
          },
          ...state.todayShiftLogs,
        ]

        set({
          clockedIn: false,
          clockOutTime: timeStr,
          clockInTimestamp: null,
          isOnBreak: false,
          breakStartTime: null,
          accumulatedWorkSeconds: totalRegularSeconds,
          accumulatedBreakSeconds: 0,
          lastWorkDate: todayDateStr(),
          todayShiftLogs: updatedLogs,
          overtimeRecords: [record, ...state.overtimeRecords],
        })

        // Write to Firestore
        if (meta.uid) {
          upsertAttendanceLog(meta.uid, {
            displayName: meta.displayName || 'Employee',
            departmentName: meta.departmentName || '',
            clockedIn: false,
            clockInTime: state.clockInTime,
            clockInTimestamp: null,
            clockOutTime: timeStr,
            autoClockOut: true,
            regularSeconds: totalRegularSeconds,
            regularHours: secToHrsStr(totalRegularSeconds),
            accumulatedWorkSeconds: totalRegularSeconds,
            accumulatedBreakSeconds: 0,
            isOnBreak: false,
            extraSeconds: state.accumulatedExtraSeconds,
            extraHours: secToHrsStr(state.accumulatedExtraSeconds),
            date: todayDateStr(),
            todayShiftLogs: updatedLogs,
            shiftLogs: updatedLogs,
          })
        }
      },

      /**
       * Toggle normal clock in / clock out.
       * @param {object} userMeta - { uid, displayName, departmentName }
       */
      toggleClockIn: (userMeta = {}) => {
        const meta = resolveUserMeta(userMeta)
        const state = get()
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.clockedIn) {
          // --- Clocking In ---
          const nowMs = Date.now()
          const initialClockIn = state.clockInTime || timeStr
          const newLogs = [
            {
              id: `log_${nowMs}`,
              type: 'clock_in',
              label: 'Clocked In',
              time: timeStr,
              timestamp: nowMs,
            },
            ...state.todayShiftLogs,
          ]

          set({
            currentUserId: meta.uid || state.currentUserId,
            clockedIn: true,
            clockInTime: initialClockIn,
            clockInTimestamp: nowMs,
            clockOutTime: null,
            isOnBreak: false,
            breakStartTime: null,
            accumulatedBreakSeconds: 0,
            accumulatedWorkSeconds: state.accumulatedWorkSeconds, // Keep worked hours accrued today!
            isInExtraTime: false,
            extraTimeStart: null,
            accumulatedExtraSeconds: state.accumulatedExtraSeconds,
            extraTimeLogs: state.extraTimeLogs,
            todayShiftLogs: newLogs,
          })

          // Write to Firestore
          if (meta.uid) {
            upsertAttendanceLog(meta.uid, {
              displayName: meta.displayName || 'Employee',
              departmentName: meta.departmentName || '',
              clockedIn: true,
              clockInTime: initialClockIn,
              clockInTimestamp: nowMs,
              clockOutTime: null,
              autoClockOut: false,
              regularSeconds: state.accumulatedWorkSeconds,
              regularHours: secToHrsStr(state.accumulatedWorkSeconds),
              accumulatedWorkSeconds: state.accumulatedWorkSeconds,
              accumulatedBreakSeconds: 0,
              isOnBreak: false,
              extraSeconds: state.accumulatedExtraSeconds,
              extraHours: secToHrsStr(state.accumulatedExtraSeconds),
              date: todayDateStr(),
              todayShiftLogs: newLogs,
              shiftLogs: newLogs,
            })
          }
        } else {
          // --- Clocking Out ---
          const sessionSeconds = state.clockInTimestamp
            ? Math.floor((Date.now() - state.clockInTimestamp) / 1000)
            : 0
          const netSeconds = Math.max(0, sessionSeconds - state.accumulatedBreakSeconds)
          const totalRegularSeconds = state.accumulatedWorkSeconds + netSeconds

          const newLog = {
            id: `log_${Date.now()}`,
            type: 'clock_out',
            label: 'Clocked Out',
            time: timeStr,
            timestamp: Date.now(),
          }
          const updatedLogs = [newLog, ...state.todayShiftLogs]

          const record = {
            id: `ot_${Date.now()}`,
            date: todayDateStr(),
            regularSeconds: totalRegularSeconds,
            extraSeconds: state.accumulatedExtraSeconds,
            clockIn: state.clockInTime,
            clockOut: timeStr,
            autoClockOut: false,
          }

          set({
            clockedIn: false,
            clockOutTime: timeStr,
            clockInTimestamp: null,
            isOnBreak: false,
            breakStartTime: null,
            accumulatedWorkSeconds: totalRegularSeconds,
            accumulatedBreakSeconds: 0,
            lastWorkDate: todayDateStr(),
            todayShiftLogs: updatedLogs,
            overtimeRecords: [record, ...state.overtimeRecords],
          })

          // Write to Firestore
          if (meta.uid) {
            upsertAttendanceLog(meta.uid, {
              displayName: meta.displayName || 'Employee',
              departmentName: meta.departmentName || '',
              clockedIn: false,
              clockInTime: state.clockInTime,
              clockInTimestamp: null,
              clockOutTime: timeStr,
              autoClockOut: false,
              regularSeconds: totalRegularSeconds,
              regularHours: secToHrsStr(totalRegularSeconds),
              accumulatedWorkSeconds: totalRegularSeconds,
              accumulatedBreakSeconds: 0,
              isOnBreak: false,
              extraSeconds: state.accumulatedExtraSeconds,
              extraHours: secToHrsStr(state.accumulatedExtraSeconds),
              date: todayDateStr(),
              todayShiftLogs: updatedLogs,
              shiftLogs: updatedLogs,
            })
          }
        }
      },

      /**
       * Toggle Extra / Overtime session (only after office hours end).
       * @param {object} userMeta - { uid, displayName, departmentName }
       */
      toggleExtraTime: (userMeta = {}) => {
        const meta = resolveUserMeta(userMeta)
        const state = get()
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.isInExtraTime) {
          // If employee was active clockedIn, finalize regular shift first!
          let finalRegularSec = state.accumulatedWorkSeconds
          let updatedShiftLogs = state.todayShiftLogs
          if (state.clockedIn && state.clockInTimestamp) {
            const sessionSeconds = Math.floor((Date.now() - state.clockInTimestamp) / 1000)
            const netSeconds = Math.max(0, sessionSeconds - state.accumulatedBreakSeconds)
            finalRegularSec += netSeconds
            updatedShiftLogs = [
              {
                id: `log_${Date.now()}`,
                type: 'clock_out',
                label: 'Shift Ended (Started Extra Time)',
                time: timeStr,
                timestamp: Date.now(),
              },
              ...state.todayShiftLogs,
            ]
          }

          const newExtraLog = {
            id: `xt_${Date.now()}`,
            type: 'extra_start',
            label: 'Extra Time Started',
            time: timeStr,
            timestamp: Date.now(),
          }

          set({
            clockedIn: false,
            clockInTimestamp: null,
            clockOutTime: state.clockedIn ? timeStr : state.clockOutTime,
            isOnBreak: false,
            breakStartTime: null,
            accumulatedWorkSeconds: finalRegularSec,
            accumulatedBreakSeconds: 0,
            isInExtraTime: true,
            extraTimeStart: Date.now(),
            extraTimeLogs: [newExtraLog, ...state.extraTimeLogs],
            todayShiftLogs: updatedShiftLogs,
          })

          // Write complete attendance snapshot to Firestore
          if (meta.uid) {
            upsertAttendanceLog(meta.uid, {
              displayName: meta.displayName || 'Employee',
              departmentName: meta.departmentName || '',
              clockedIn: false,
              clockInTime: state.clockInTime,
              clockInTimestamp: null,
              clockOutTime: state.clockedIn ? timeStr : state.clockOutTime,
              regularSeconds: finalRegularSec,
              regularHours: secToHrsStr(finalRegularSec),
              accumulatedWorkSeconds: finalRegularSec,
              accumulatedBreakSeconds: 0,
              isOnBreak: false,
              isInExtraTime: true,
              extraTimeStart: Date.now(),
              extraSeconds: state.accumulatedExtraSeconds,
              extraHours: secToHrsStr(state.accumulatedExtraSeconds),
              date: todayDateStr(),
              todayShiftLogs: updatedShiftLogs,
              shiftLogs: updatedShiftLogs,
            })
          }
        } else {
          const extraSessionSec = state.extraTimeStart
            ? Math.floor((Date.now() - state.extraTimeStart) / 1000)
            : 0
          const totalExtra = state.accumulatedExtraSeconds + extraSessionSec

          const newLog = {
            id: `xt_${Date.now()}`,
            type: 'extra_end',
            label: 'Extra Time Ended',
            time: timeStr,
            timestamp: Date.now(),
          }
          const updatedExtraLogs = [newLog, ...state.extraTimeLogs]

          const updatedRecords = state.overtimeRecords.map((rec, idx) =>
            idx === 0 ? { ...rec, extraSeconds: totalExtra } : rec
          )

          set({
            isInExtraTime: false,
            extraTimeStart: null,
            accumulatedExtraSeconds: totalExtra,
            extraTimeLogs: updatedExtraLogs,
            overtimeRecords: updatedRecords,
          })

          // Write to Firestore
          if (meta.uid) {
            upsertAttendanceLog(meta.uid, {
              displayName: meta.displayName || 'Employee',
              departmentName: meta.departmentName || '',
              isInExtraTime: false,
              extraTimeStart: null,
              extraSeconds: totalExtra,
              extraHours: secToHrsStr(totalExtra),
              extraTimeLogs: updatedExtraLogs,
            })
          }
        }
      },

      toggleBreak: (userMeta = {}) => {
        const meta = resolveUserMeta(userMeta)
        const state = get()
        if (!state.clockedIn) return
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.isOnBreak) {
          const breakStartMs = Date.now()
          const newLog = {
            id: `log_${breakStartMs}`,
            type: 'break_start',
            label: 'Started Break',
            time: timeStr,
            timestamp: breakStartMs,
          }
          const updatedLogs = [newLog, ...state.todayShiftLogs]
          set({
            isOnBreak: true,
            breakStartTime: breakStartMs,
            todayShiftLogs: updatedLogs,
          })

          if (meta.uid) {
            upsertAttendanceLog(meta.uid, {
              displayName: meta.displayName || 'Employee',
              departmentName: meta.departmentName || '',
              isOnBreak: true,
              breakStartTime: breakStartMs,
              todayShiftLogs: updatedLogs,
              shiftLogs: updatedLogs,
            })
          }
        } else {
          const breakDuration = state.breakStartTime
            ? Math.floor((Date.now() - state.breakStartTime) / 1000)
            : 0
          const newBreakTotal = state.accumulatedBreakSeconds + breakDuration
          const newLog = {
            id: `log_${Date.now()}`,
            type: 'break_end',
            label: 'Ended Break',
            time: timeStr,
            timestamp: Date.now(),
          }
          const updatedLogs = [newLog, ...state.todayShiftLogs]
          set({
            isOnBreak: false,
            breakStartTime: null,
            accumulatedBreakSeconds: newBreakTotal,
            todayShiftLogs: updatedLogs,
          })

          if (meta.uid) {
            upsertAttendanceLog(meta.uid, {
              displayName: meta.displayName || 'Employee',
              departmentName: meta.departmentName || '',
              isOnBreak: false,
              breakStartTime: null,
              accumulatedBreakSeconds: newBreakTotal,
              todayShiftLogs: updatedLogs,
              shiftLogs: updatedLogs,
            })
          }
        }
      },
    }),
    {
      name: 'crm_employee_team_store',
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        clockedIn: state.clockedIn,
        clockInTime: state.clockInTime,
        clockInTimestamp: state.clockInTimestamp,
        clockOutTime: state.clockOutTime,
        isOnBreak: state.isOnBreak,
        breakStartTime: state.breakStartTime,
        accumulatedBreakSeconds: state.accumulatedBreakSeconds,
        accumulatedWorkSeconds: state.accumulatedWorkSeconds,
        todayShiftLogs: state.todayShiftLogs,
        isInExtraTime: state.isInExtraTime,
        extraTimeStart: state.extraTimeStart,
        accumulatedExtraSeconds: state.accumulatedExtraSeconds,
        extraTimeLogs: state.extraTimeLogs,
        overtimeRecords: state.overtimeRecords,
        lastWorkDate: state.lastWorkDate,
      }),
    }
  )
)

