import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useTeamStore = create(
  persist(
    (set, get) => ({
      employees: [],
      departments: [],
      leaveRequests: [],
      clockedIn: false,
      clockInTime: null,
      clockInTimestamp: null,
      clockOutTime: null,
      isOnBreak: false,
      breakStartTime: null,
      accumulatedBreakSeconds: 0,
      accumulatedWorkSeconds: 0,
      todayShiftLogs: [],
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

      toggleClockIn: () => {
        const state = get()
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.clockedIn) {
          // Clocking In
          set({
            clockedIn: true,
            clockInTime: timeStr,
            clockInTimestamp: Date.now(),
            isOnBreak: false,
            breakStartTime: null,
            todayShiftLogs: [
              { id: `log_${Date.now()}`, type: 'clock_in', label: 'Clocked In', time: timeStr, timestamp: Date.now() },
              ...state.todayShiftLogs,
            ],
          })
        } else {
          // Clocking Out
          const sessionSeconds = state.clockInTimestamp ? Math.floor((Date.now() - state.clockInTimestamp) / 1000) : 0
          const netSeconds = Math.max(0, sessionSeconds - state.accumulatedBreakSeconds)
          set({
            clockedIn: false,
            clockOutTime: timeStr,
            clockInTimestamp: null,
            isOnBreak: false,
            breakStartTime: null,
            accumulatedWorkSeconds: state.accumulatedWorkSeconds + netSeconds,
            accumulatedBreakSeconds: 0,
            todayShiftLogs: [
              { id: `log_${Date.now()}`, type: 'clock_out', label: 'Clocked Out', time: timeStr, timestamp: Date.now() },
              ...state.todayShiftLogs,
            ],
          })
        }
      },

      toggleBreak: () => {
        const state = get()
        if (!state.clockedIn) return
        const now = new Date()
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

        if (!state.isOnBreak) {
          set({
            isOnBreak: true,
            breakStartTime: Date.now(),
            todayShiftLogs: [
              { id: `log_${Date.now()}`, type: 'break_start', label: 'Started Break', time: timeStr, timestamp: Date.now() },
              ...state.todayShiftLogs,
            ],
          })
        } else {
          const breakDuration = state.breakStartTime ? Math.floor((Date.now() - state.breakStartTime) / 1000) : 0
          set({
            isOnBreak: false,
            breakStartTime: null,
            accumulatedBreakSeconds: state.accumulatedBreakSeconds + breakDuration,
            todayShiftLogs: [
              { id: `log_${Date.now()}`, type: 'break_end', label: 'Ended Break', time: timeStr, timestamp: Date.now() },
              ...state.todayShiftLogs,
            ],
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
      }),
    }
  )
)

