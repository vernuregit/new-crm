import React, { useMemo, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toDateKey = (year, month, day) => {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

const parseDueDateKey = (dueDate) => {
  if (!dueDate) return null
  if (typeof dueDate === 'string') return dueDate.slice(0, 10)
  if (typeof dueDate === 'object' && dueDate.seconds) {
    return new Date(dueDate.seconds * 1000).toISOString().slice(0, 10)
  }
  try {
    return new Date(dueDate).toISOString().slice(0, 10)
  } catch {
    return null
  }
}

export const TaskCalendarView = ({ tasks = [], statuses = [], onTaskClick, getLeadName }) => {
  const [currentViewDate, setCurrentViewDate] = useState(() => new Date())
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )

  const year = currentViewDate.getFullYear()
  const month = currentViewDate.getMonth()

  const statusMap = useMemo(() => {
    const map = {}
    statuses.forEach((s) => {
      map[s.id] = s.name
    })
    return map
  }, [statuses])

  const tasksByDate = useMemo(() => {
    const map = {}
    tasks.forEach((task) => {
      const key = parseDueDateKey(task.dueDate)
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(task)
    })
    return map
  }, [tasks])

  const monthName = currentViewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const gridCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const cells = []

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      cells.push({
        day: dayNum,
        isCurrentMonth: false,
        dateKey: toDateKey(prevYear, prevMonth, dayNum),
        key: `prev-${dayNum}`,
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        dateKey: toDateKey(year, month, d),
        key: `curr-${d}`,
      })
    }

    const totalSlotsNeeded = cells.length > 35 ? 42 : 35
    const remainingSlots = totalSlotsNeeded - cells.length
    for (let n = 1; n <= remainingSlots; n++) {
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year
      cells.push({
        day: n,
        isCurrentMonth: false,
        dateKey: toDateKey(nextYear, nextMonth, n),
        key: `next-${n}`,
      })
    }

    return cells
  }, [year, month])

  const selectedTasks = tasksByDate[selectedDateKey] || []
  const todayKey = new Date().toISOString().slice(0, 10)
  const undatedCount = tasks.filter((t) => !parseDueDateKey(t.dueDate)).length

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{monthName}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                setCurrentViewDate(now)
                setSelectedDateKey(now.toISOString().slice(0, 10))
              }}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 py-1"
            >
              {day}
            </div>
          ))}

          {gridCells.map((cell) => {
            const dayTasks = tasksByDate[cell.dateKey] || []
            const isSelected = selectedDateKey === cell.dateKey
            const isToday = todayKey === cell.dateKey

            return (
              <button
                type="button"
                key={cell.key}
                onClick={() => setSelectedDateKey(cell.dateKey)}
                className={`min-h-[88px] rounded-xl border p-1.5 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-indigo-500/40'
                    : isToday
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                } ${!cell.isCurrentMonth ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[11px] font-bold ${
                      isToday
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.taskId || task.id}
                      className="truncate text-[9px] px-1 py-0.5 rounded bg-white dark:bg-[#12151E] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <div className="text-[9px] text-slate-400 px-1">+{dayTasks.length - 2} more</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {undatedCount > 0 && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {undatedCount} task{undatedCount === 1 ? '' : 's'} without a due date (not shown on calendar).
          </p>
        )}
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181C27] p-4 space-y-3 h-fit">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {selectedTasks.length} due task{selectedTasks.length === 1 ? '' : 's'}
          </p>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center text-[11px] text-slate-400">
            No tasks due on this day
          </div>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {selectedTasks.map((task) => (
              <button
                type="button"
                key={task.taskId || task.id}
                onClick={() => onTaskClick?.(task)}
                className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/70 dark:bg-slate-900/40 transition-colors space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {task.title}
                  </span>
                  <Badge
                    variant={
                      task.priority === 'critical' || task.priority === 'high' ? 'danger' : 'info'
                    }
                  >
                    {task.priority}
                  </Badge>
                </div>
                <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium truncate">
                  {task.projectName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {statusMap[task.status] || task.status} ·{' '}
                  {getLeadName?.(task) || task.createdByName || task.assigneeName || 'Unassigned'}
                </p>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
