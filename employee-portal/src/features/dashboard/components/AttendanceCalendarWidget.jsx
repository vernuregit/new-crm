import React, { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { useTeamStore } from '../../team/stores/teamStore'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const AttendanceCalendarWidget = () => {
  const { clockedIn, todayShiftLogs } = useTeamStore()

  // Default view date (current month/year)
  const [currentViewDate, setCurrentViewDate] = useState(() => new Date())
  
  // Selected date state (defaults to today's date)
  const todayDateObj = new Date()
  const [selectedDay, setSelectedDay] = useState(todayDateObj.getDate())

  // Custom attendance overrides state (dateKey -> 'present' | 'absent')
  const [customStatuses, setCustomStatuses] = useState({})

  const year = currentViewDate.getFullYear()
  const month = currentViewDate.getMonth()

  // Month name formatting e.g. "July 2026"
  const monthName = currentViewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentViewDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentViewDate(new Date(year, month + 1, 1))
  }

  // Calculate calendar grid days
  const firstDayOfMonth = new Date(year, month, 1).getDay() // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // Build grid items
  const gridCells = []

  // 1. Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    gridCells.push({
      day: dayNum,
      isCurrentMonth: false,
      isPrevMonth: true,
      key: `prev-${dayNum}`,
    })
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({
      day: d,
      isCurrentMonth: true,
      key: `curr-${d}`,
    })
  }

  // 3. Next month leading days (complete to 35 or 42 slots)
  const totalSlotsNeeded = gridCells.length > 35 ? 42 : 35
  const remainingSlots = totalSlotsNeeded - gridCells.length
  for (let n = 1; n <= remainingSlots; n++) {
    gridCells.push({
      day: n,
      isCurrentMonth: false,
      isNextMonth: true,
      key: `next-${n}`,
    })
  }

  // Determine presence/absence status for a date
  const getAttendanceStatus = (dayNum, isCurrentMonth) => {
    if (!isCurrentMonth) return null

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    if (customStatuses[dateKey] !== undefined) {
      return customStatuses[dateKey] === 'none' ? null : customStatuses[dateKey]
    }

    const cellDate = new Date(year, month, dayNum)
    const dayOfWeek = cellDate.getDay() // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const todayMidnight = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth(), todayDateObj.getDate())
    const isToday =
      dayNum === todayDateObj.getDate() &&
      month === todayDateObj.getMonth() &&
      year === todayDateObj.getFullYear()

    const isFuture = cellDate > todayMidnight

    // Weekends and future dates show no status color by default
    if (isWeekend || isFuture) {
      return null
    }

    // Today's dynamic sync with clockedIn state or shift log activity
    if (isToday) {
      const isPresentToday = clockedIn || (todayShiftLogs && todayShiftLogs.length > 0)
      return isPresentToday ? 'present' : 'absent'
    }

    // Past working days (Monday - Friday): realistic pattern of present/absent
    const absentDaysPattern = [4, 13, 19]
    if (absentDaysPattern.includes(dayNum)) {
      return 'absent'
    }
    return 'present'
  }

  const handleCellClick = (cell) => {
    if (!cell.isCurrentMonth) return
    setSelectedDay(cell.day)

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
    const currentStatus = getAttendanceStatus(cell.day, true)
    
    // Cycle: 'present' -> 'absent' -> 'none' (no dot) -> 'present'
    let nextStatus
    if (currentStatus === 'present') {
      nextStatus = 'absent'
    } else if (currentStatus === 'absent') {
      nextStatus = 'none'
    } else {
      nextStatus = 'present'
    }

    setCustomStatuses((prev) => ({
      ...prev,
      [dateKey]: nextStatus,
    }))
  }

  const weekHeader = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const is6Rows = totalSlotsNeeded > 35

  return (
    <Card className="lg:col-span-3 p-3 w-full border-slate-200 dark:border-slate-800 flex flex-col justify-between  bg-white dark:bg-[#181C27] shadow-sm select-none ">
      <div className="flex flex-col  justify-between">
        {/* Top Header & Month Nav */}
        <div>
          {/* Header Title */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm tracking-tight">
              Attendance Calendar
            </h3>
          </div>

          {/* Month & Year Navigation */}
          <div className="flex items-center justify-center gap-2 py-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs tracking-tight min-w-[80px] text-center">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-0.5 mb-1 text-center">
            {weekHeader.map((d) => (
              <span
                key={d}
                className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-0.5 gap-x-0.5 items-center justify-items-center">
            {gridCells.map((cell) => {
              const status = getAttendanceStatus(cell.day, cell.isCurrentMonth)
              const isSelected = cell.isCurrentMonth && cell.day === selectedDay

              return (
                <div
                  key={cell.key}
                  onClick={() => handleCellClick(cell)}
                  className={`flex flex-col items-center justify-center w-full cursor-pointer rounded transition-all ${
                    cell.isCurrentMonth ? 'hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40' : 'cursor-default'
                  }`}
                >
                  {/* Day Number */}
                  <div
                    className={`rounded-full flex items-center justify-center font-semibold leading-none transition-colors ${
                      is6Rows ? 'w-4.5 h-4.5 text-[10px]' : 'w-5 h-5 text-[11px]'
                    } ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/40'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-300 dark:text-slate-600 font-normal'
                    }`}
                  >
                    {cell.day}
                  </div>

                  {/* Dot Indicator */}
                  <div className="h-1.5 flex items-center justify-center mt-0.5">
                    {cell.isCurrentMonth && status && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend Footer */}
        <div className="pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-4 text-[10px] font-medium text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Absent</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
