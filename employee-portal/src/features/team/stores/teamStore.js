import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { upsertAttendanceLog } from '../services/attendanceService'

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

export const useTeamStore = create(
  persist(
    (set, get) => ({
      employees: [],
      departments: [],
      leaveRequests: [],

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
       * Auto clock-out at 7:00 PM. Called by the widget's useEffect.
       * @param {object} userMeta - { uid, displayName, departmentName }
       */
      autoClockOutAtEndOfDay: (userMeta = {}) => {
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

        set({
          clockedIn: false,
          clockOutTime: timeStr,
          clockInTimestamp: null,
          isOnBreak: false,
          breakStartTime: null,
          accumulatedWorkSeconds: totalRegularSeconds,
          accumulatedBreakSeconds: 0,
          lastWorkDate: todayDateStr(),
          todayShiftLogs: [
            {
              id: `log_${Date.now()}`,
              type: 'auto_clock_out',
              label: 'Auto Clocked Out (EOD)',
              time: timeStr,
              timestamp: endTs,
            },
            ...state.todayShiftLogs,
          ],
          overtimeRecords: [record, ...state.overtimeRecords],
        })

        // Write to Firestore
        upsertAttendanceLog(userMeta.uid, {
          displayName: userMeta.displayName || 'Employee',
          departmentName: userMeta.departmentName || '',
          clockedIn: false,
          clockInTime: state.clockInTime,
          clockOutTime: timeStr,
          autoClockOut: true,
          regularSeconds: totalRegularSeconds,
          regularHours: secToHrsStr(totalRegularSeconds),
          extraSeconds: state.accumulatedExtraSeconds,
          extraHours: secToHrsStr(state.accumulatedExtraSeconds),
          date: todayDateStr(),
          shiftLogs: [
            {
              type: 'auto_clock_out',
              label: 'Auto Clocked Out (EOD)',
              time: timeStr,
              timestamp: endTs,
            },
            ...state.todayShiftLogs,
          ],
        })
      },

      /**
       * Toggle normal clock in / clock out.
       * @param {object} userMeta - { uid, displayName, departmentName }
       */
      toggleClockIn: (userMeta = {}) => {
        const state = get()
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.clockedIn) {
          // --- Clocking In ---
          const newLogs = [
            {
              id: `log_${Date.now()}`,
              type: 'clock_in',
              label: 'Clocked In',
              time: timeStr,
              timestamp: Date.now(),
            },
          ]

          set({
            clockedIn: true,
            clockInTime: timeStr,
            clockInTimestamp: Date.now(),
            clockOutTime: null,
            isOnBreak: false,
            breakStartTime: null,
            accumulatedBreakSeconds: 0,
            accumulatedWorkSeconds: 0,
            isInExtraTime: false,
            extraTimeStart: null,
            accumulatedExtraSeconds: 0,
            extraTimeLogs: [],
            todayShiftLogs: newLogs,
          })

          // Write to Firestore
          upsertAttendanceLog(userMeta.uid, {
            displayName: userMeta.displayName || 'Employee',
            departmentName: userMeta.departmentName || '',
            clockedIn: true,
            clockInTime: timeStr,
            clockOutTime: null,
            autoClockOut: false,
            regularSeconds: 0,
            regularHours: '0h 0m',
            extraSeconds: 0,
            extraHours: '0h 0m',
            date: todayDateStr(),
            shiftLogs: newLogs,
          })
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
          upsertAttendanceLog(userMeta.uid, {
            displayName: userMeta.displayName || 'Employee',
            departmentName: userMeta.departmentName || '',
            clockedIn: false,
            clockInTime: state.clockInTime,
            clockOutTime: timeStr,
            autoClockOut: false,
            regularSeconds: totalRegularSeconds,
            regularHours: secToHrsStr(totalRegularSeconds),
            extraSeconds: state.accumulatedExtraSeconds,
            extraHours: secToHrsStr(state.accumulatedExtraSeconds),
            date: todayDateStr(),
            shiftLogs: updatedLogs,
          })
        }
      },

      /**
       * Toggle Extra / Overtime session (only after office hours end).
       * @param {object} userMeta - { uid, displayName, departmentName }
       */
      toggleExtraTime: (userMeta = {}) => {
        const state = get()
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.isInExtraTime) {
          const newLog = {
            id: `xt_${Date.now()}`,
            type: 'extra_start',
            label: 'Extra Time Started',
            time: timeStr,
            timestamp: Date.now(),
          }
          set({
            isInExtraTime: true,
            extraTimeStart: Date.now(),
            extraTimeLogs: [newLog, ...state.extraTimeLogs],
          })

          // Write to Firestore
          upsertAttendanceLog(userMeta.uid, {
            displayName: userMeta.displayName || 'Employee',
            departmentName: userMeta.departmentName || '',
            isInExtraTime: true,
            extraTimeStart: Date.now(),
          })
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
          upsertAttendanceLog(userMeta.uid, {
            displayName: userMeta.displayName || 'Employee',
            departmentName: userMeta.departmentName || '',
            isInExtraTime: false,
            extraTimeStart: null,
            extraSeconds: totalExtra,
            extraHours: secToHrsStr(totalExtra),
            extraTimeLogs: updatedExtraLogs,
          })
        }
      },

      toggleBreak: (userMeta = {}) => {
        const state = get()
        if (!state.clockedIn) return
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.isOnBreak) {
          const newLog = {
            id: `log_${Date.now()}`,
            type: 'break_start',
            label: 'Started Break',
            time: timeStr,
            timestamp: Date.now(),
          }
          const updatedLogs = [newLog, ...state.todayShiftLogs]
          set({
            isOnBreak: true,
            breakStartTime: Date.now(),
            todayShiftLogs: updatedLogs,
          })

          upsertAttendanceLog(userMeta.uid, {
            displayName: userMeta.displayName || 'Employee',
            departmentName: userMeta.departmentName || '',
            isOnBreak: true,
            shiftLogs: updatedLogs,
          })
        } else {
          const breakDuration = state.breakStartTime
            ? Math.floor((Date.now() - state.breakStartTime) / 1000)
            : 0
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
            accumulatedBreakSeconds: state.accumulatedBreakSeconds + breakDuration,
            todayShiftLogs: updatedLogs,
          })

          upsertAttendanceLog(userMeta.uid, {
            displayName: userMeta.displayName || 'Employee',
            departmentName: userMeta.departmentName || '',
            isOnBreak: false,
            shiftLogs: updatedLogs,
          })
        }
      },
    }),
    {
      name: 'crm_employee_team_store',
      partialize: (state) => ({
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
