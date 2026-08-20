import React, { useState } from 'react'
import { Eye, EyeOff, Calendar } from 'lucide-react'

export const Input = ({
  label,
  error,
  icon: customIcon,
  className = '',
  id,
  type,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || props.name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const isPasswordType = type === 'password'
  const isDateType = type === 'date' || type === 'datetime-local' || type === 'time'
  const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type
  const Icon = customIcon

  const handleOpenPicker = (e) => {
    const container = e.currentTarget.closest('.relative')
    const inputEl = container?.querySelector('input')
    if (inputEl && typeof inputEl.showPicker === 'function') {
      try {
        inputEl.showPicker()
      } catch {
        inputEl.focus()
      }
    } else if (inputEl) {
      inputEl.focus()
    }
  }

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          {label}
        </label>
      )}
      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 z-10">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={computedType}
          onClick={(e) => {
            if (isDateType && typeof e.target.showPicker === 'function') {
              try { e.target.showPicker() } catch {}
            }
            props.onClick?.(e)
          }}
          className={`w-full bg-slate-100/80 dark:bg-[#11141E] border ${
            error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
          } text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-xl py-2.5 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${isPasswordType || isDateType ? 'pr-10' : 'pr-3.5'} [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer transition-all focus:outline-none focus:ring-2 ${className}`}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {isDateType && (
          <button
            type="button"
            onClick={handleOpenPicker}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors focus:outline-none cursor-pointer"
            tabIndex={-1}
            aria-label="Open date calendar"
          >
            <Calendar className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{error}</p>}
    </div>
  )
}
