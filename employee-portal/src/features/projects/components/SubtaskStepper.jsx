import React, { useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { useProjectStore } from '../stores/projectStore'
import {
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Award,
  Layers,
} from 'lucide-react'

export const SubtaskStepper = ({ taskId, subtasks = [], compact = false }) => {
  const { addSubtask, toggleSubtask, deleteSubtask, autoDecomposeTask } = useProjectStore()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const totalCount = subtasks.length
  const completedCount = subtasks.filter((st) => st.isCompleted).length
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
  const isAllCompleted = totalCount > 0 && completedCount === totalCount

  const handleAddSubtaskSubmit = (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    if (addSubtask) {
      addSubtask(taskId, {
        title: newTitle.trim(),
      })
    }

    setNewTitle('')
    setShowAddForm(false)
  }

  // Compact View for Kanban Cards
  if (compact) {
    if (totalCount === 0) return null
    return (
      <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 font-semibold">
            <Layers className="w-3 h-3 text-indigo-500" /> Subtasks
          </span>
          <span className="font-mono">
            {completedCount}/{totalCount} ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isAllCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header & Subtask Progress Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Subtask Checklist
            </h4>
            {totalCount > 0 && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                {completedCount}/{totalCount} Completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-48 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isAllCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {progressPercent}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalCount === 0 && autoDecomposeTask && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => autoDecomposeTask(taskId)}
              className="text-xs text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800"
              icon={Sparkles}
            >
              AI Auto-Breakdown
            </Button>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowAddForm(!showAddForm)}
            icon={Plus}
          >
            Add Subtask
          </Button>
        </div>
      </div>

      {/* Completion Celebration Banner */}
      {isAllCompleted && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">All Subtasks Completed!</p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-normal">
                Great job! All subtasks in this task are finished.
              </p>
            </div>
          </div>
          <Badge variant="success">Task Complete</Badge>
        </div>
      )}

      {/* Add Subtask Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSubtaskSubmit}
          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-indigo-500" /> Create New Subtask
          </div>
          <input
            type="text"
            placeholder="Subtask title (e.g. Code Review, Testing)..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-white dark:bg-[#181C27] border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            autoFocus
            required
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" variant="primary">
              Save Subtask
            </Button>
          </div>
        </form>
      )}

      {/* Step-by-Step Vertical List with Clickable Circle Icons */}
      {totalCount === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No subtasks added yet. Click "Add Subtask" or use AI Auto-Breakdown.
          </p>
        </div>
      ) : (
        <div className="relative pl-7 space-y-4 my-2">
          {/* Continuous Vertical Connecting Line */}
          <div className="absolute left-[13px] top-3 bottom-3 w-[2px] bg-slate-200 dark:bg-slate-800 pointer-events-none" />

          {subtasks.map((st, index) => {
            const isCompleted = st.isCompleted
            const isLast = index === subtasks.length - 1

            return (
              <div key={st.id} className="relative flex items-center justify-between group py-1">
                {/* Active Connected Progress Line Segment */}
                {isCompleted && !isLast && (
                  <div
                    className="absolute left-[-15px] top-[14px] w-[2px] h-[calc(100%+16px)] bg-emerald-500 dark:bg-emerald-400 transition-all duration-500 z-0"
                  />
                )}

                {/* Clickable Circle Icon Node */}
                <button
                  type="button"
                  onClick={() => toggleSubtask && toggleSubtask(taskId, st.id)}
                  title={isCompleted ? 'Click to mark incomplete' : 'Click to complete subtask'}
                  className={`absolute -left-7 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                    isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105 hover:scale-110'
                      : 'bg-white dark:bg-[#181C27] border-2 border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 hover:scale-110'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 transition-colors group-hover:bg-emerald-500" />
                  )}
                </button>

                {/* Subtask Title */}
                <div
                  onClick={() => toggleSubtask && toggleSubtask(taskId, st.id)}
                  className={`flex-1 ml-3 cursor-pointer transition-all ${
                    isCompleted ? 'opacity-70' : ''
                  }`}
                >
                  <h5
                    className={`text-sm font-semibold transition-colors ${
                      isCompleted
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400'
                    }`}
                  >
                    {st.title}
                  </h5>
                </div>

                {/* Delete Action Button */}
                {deleteSubtask && (
                  <button
                    type="button"
                    onClick={() => deleteSubtask(taskId, st.id)}
                    title="Delete subtask"
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
