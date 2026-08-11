import React, { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/layout/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useTimelineStore } from './stores/timelineStore'
import { getWeekDates, toDateStr } from './services/timelineService'
import { useUserStore } from '../../stores/userStore'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TARGET_DAY_HOURS = 8
const ENTRY_TYPES = [
  { id: 'work', label: 'Work' },
  { id: 'upskilling', label: 'Upskilling' },
]

function formatHours(hours) {
  const n = Number(hours) || 0
  if (n === 0) return '0h'
  if (Number.isInteger(n)) return `${n}h`
  return `${n}h`
}

function entryTypeLabel(entryType) {
  return entryType === 'upskilling' ? 'Upskilling' : 'Work'
}

function TimelineEntryCard({ entry, interactive = false, onEdit }) {
  const type = entry.entryType === 'upskilling' ? 'upskilling' : 'work'
  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onEdit : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onEdit?.(e)
              }
            }
          : undefined
      }
      className={`rounded-xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-700/70 p-2.5 ${
        interactive
          ? 'hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors cursor-pointer'
          : ''
      }`}
    >
      <p className="w-full text-xs text-slate-800 dark:text-slate-100 leading-snug break-words line-clamp-4">
        {entry.description}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p
          className={`text-[10px] ${
            type === 'upskilling'
              ? 'text-violet-500 dark:text-violet-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {entryTypeLabel(type)}
        </p>
        <span className="shrink-0 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/80 dark:bg-slate-700/80 rounded-md px-1.5 py-0.5">
          {formatHours(entry.hours)}
        </span>
      </div>
    </div>
  )
}

function weekRangeLabel(days) {
  if (!days?.length) return ''
  const start = days[0]
  const end = days[days.length - 1]
  const opts = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString([], opts)
  const endStr = end.toLocaleDateString([], {
    ...opts,
    year: start.getFullYear() !== end.getFullYear() ? 'numeric' : undefined,
  })
  const year =
    start.getFullYear() === end.getFullYear() ? `, ${start.getFullYear()}` : ''
  return `${startStr} – ${endStr}${year}`
}

export const WorkTimelinePage = () => {
  const { user, userDoc } = useUserStore()
  const uid = userDoc?.uid || user?.uid
  const employeeName = userDoc?.displayName || user?.displayName || 'Employee'

  const {
    weekAnchor,
    entries,
    loading,
    shiftWeek,
    setWeekAnchor,
    loadWeekEntries,
    addEntry,
    editEntry,
    removeEntry,
  } = useTimelineStore()

  // Always derive week days from anchor (supports past weeks / past days)
  const weekDays = useMemo(() => getWeekDates(weekAnchor), [weekAnchor])

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingEntry, setEditingEntry] = useState(null)
  const [entryType, setEntryType] = useState('work')
  const [description, setDescription] = useState('')
  const [hoursInput, setHoursInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (uid) loadWeekEntries(uid)
  }, [uid, weekAnchor, loadWeekEntries])

  const entriesByDate = useMemo(() => {
    const map = {}
    for (const day of weekDays) {
      map[toDateStr(day)] = []
    }
    for (const entry of entries) {
      if (!map[entry.date]) map[entry.date] = []
      map[entry.date].push(entry)
    }
    return map
  }, [entries, weekDays])

  const weekTotal = useMemo(
    () => entries.reduce((sum, e) => sum + (Number(e.hours) || 0), 0),
    [entries]
  )

  const openAddModal = (dateStr, e) => {
    e?.stopPropagation?.()
    const today = toDateStr(new Date())
    if (dateStr < today) return
    setSelectedDate(dateStr)
    setEditingEntry(null)
    setEntryType('work')
    setDescription('')
    setHoursInput('')
    setFormError('')
    setModalOpen(true)
  }

  const openEditModal = (entry, e) => {
    e?.stopPropagation?.()
    const today = toDateStr(new Date())
    if (entry.date < today) return
    setSelectedDate(entry.date)
    setEditingEntry(entry)
    setEntryType(entry.entryType === 'upskilling' ? 'upskilling' : 'work')
    setDescription(entry.description || '')
    setHoursInput(String(entry.hours ?? ''))
    setFormError('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingEntry(null)
    setEntryType('work')
    setDescription('')
    setHoursInput('')
    setFormError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!uid) {
      setFormError('You must be signed in to save entries.')
      return
    }

    const today = toDateStr(new Date())
    if (selectedDate && selectedDate < today) {
      setFormError('Past days are view-only. You cannot add or edit entries.')
      return
    }

    const trimmed = description.trim()
    const hours = Number(hoursInput)

    if (!trimmed) {
      setFormError(
        entryType === 'upskilling'
          ? 'Please describe what you are upskilling on.'
          : 'Please describe what you worked on.'
      )
      return
    }
    if (!hoursInput || Number.isNaN(hours) || hours <= 0) {
      setFormError('Enter hours greater than 0.')
      return
    }
    if (!selectedDate) {
      setFormError('No date selected.')
      return
    }

    setSaving(true)
    try {
      if (editingEntry) {
        const ok = await editEntry(editingEntry.entryId, {
          description: trimmed,
          hours,
          entryType,
        })
        if (!ok) {
          setFormError('Could not update entry. Try again.')
          return
        }
      } else {
        const created = await addEntry({
          uid,
          employeeName,
          date: selectedDate,
          description: trimmed,
          hours,
          entryType,
        })
        if (!created) {
          setFormError('Could not save entry. Try again.')
          return
        }
      }
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingEntry) return
    const today = toDateStr(new Date())
    if (editingEntry.date < today) return
    setSaving(true)
    try {
      await removeEntry(editingEntry.entryId)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const todayStr = toDateStr(new Date())

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Timeline"
        description="Log what you worked on each day "
        actions={
          <Button
            icon={Plus}
            variant="primary"
            onClick={(e) => openAddModal(todayStr, e)}
          >
            Add Entry
          </Button>
        }
      />

      {/* Week navigator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={ChevronLeft}
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
          />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {weekRangeLabel(weekDays)}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={ChevronRight}
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekAnchor(new Date())}
          >
            This week
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>
            Week total:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {formatHours(weekTotal)}
            </strong>
          </span>
        </div>
      </div>

      {/* Mon–Sat grid — past days are view-only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {weekDays.map((day, idx) => {
          const dateStr = toDateStr(day)
          const dayEntries = entriesByDate[dateStr] || []
          const dayTotal = dayEntries.reduce(
            (sum, e) => sum + (Number(e.hours) || 0),
            0
          )
          const isToday = dateStr === todayStr
          const isPast = dateStr < todayStr
          const isFullDay = dayTotal >= TARGET_DAY_HOURS

          return (
            <Card
              key={dateStr}
              role={isPast ? undefined : 'button'}
              tabIndex={isPast ? undefined : 0}
              onClick={isPast ? undefined : (e) => openAddModal(dateStr, e)}
              onKeyDown={
                isPast
                  ? undefined
                  : (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        openAddModal(dateStr, e)
                      }
                    }
              }
              className={`flex flex-col min-h-[260px] !p-3 border transition-colors ${
                isPast
                  ? 'border-slate-200 dark:border-slate-800 cursor-default'
                  : isToday
                    ? 'border-indigo-400 dark:border-indigo-500/50 ring-1 ring-indigo-500/20 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/40'
                    : 'border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/40'
              }`}
            >
              <div className="w-full text-left mb-3 pointer-events-none">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div
                      className={`text-xs font-bold uppercase tracking-wide ${
                        isToday
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {DAY_LABELS[idx]} {day.getDate()}
                    </div>
                    {isPast ? (
                      <p className="text-[10px] text-slate-400 mt-0.5">View only</p>
                    ) : isToday ? (
                      <p className="text-[10px] text-indigo-500/80 mt-0.5">Today</p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 border ${
                      isFullDay
                        ? 'text-emerald-600 dark:text-emerald-400 border-emerald-400/60 bg-emerald-50 dark:bg-emerald-500/10'
                        : 'text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {formatHours(dayTotal)} of {TARGET_DAY_HOURS}h
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto max-h-56">
                {loading && dayEntries.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-4 text-center pointer-events-none">
                    Loading…
                  </p>
                ) : dayEntries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-8 text-[11px] text-slate-400 text-center pointer-events-none">
                    {isPast ? 'No entries' : 'Click to add'}
                  </div>
                ) : (
                  dayEntries.map((entry) => (
                    <TimelineEntryCard
                      key={entry.entryId}
                      entry={entry}
                      interactive={!isPast}
                      onEdit={(e) => openEditModal(entry, e)}
                    />
                  ))
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-[#161A24] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingEntry ? 'Edit entry' : 'Add entry'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedDate &&
                new Date(selectedDate + 'T12:00:00').toLocaleDateString([], {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
            </p>

            <div
              role="tablist"
              aria-label="Entry type"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#11141E] border border-slate-200 dark:border-slate-800"
            >
              {ENTRY_TYPES.map((tab) => {
                const selected = entryType === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setEntryType(tab.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selected
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  {entryType === 'upskilling'
                    ? 'What are you upskilling on?'
                    : 'What are you working on?'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    entryType === 'upskilling'
                      ? 'e.g. React advanced patterns course'
                      : 'e.g. API integration for client portal'
                  }
                  className="w-full bg-slate-100/80 dark:bg-[#11141E] border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              <Input
                label="Hours"
                type="number"
                min="0.25"
                step="0.25"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                placeholder="e.g. 2"
              />

              {formError && (
                <p className="text-xs text-rose-500">{formError}</p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                {editingEntry ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    disabled={saving}
                    onClick={handleDelete}
                  >
                    Delete
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={editingEntry ? Pencil : Plus}
                    disabled={saving}
                  >
                    {saving ? 'Saving…' : editingEntry ? 'Update' : 'Save'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
