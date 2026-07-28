import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export const Input = ({
  label,
  error,
  icon: Icon,
  className = '',
  id,
  type,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || props.name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)
  const isPasswordType = type === 'password'
  const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative rounded-xl">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={inputId}
          type={computedType}
          className={`w-full bg-slate-100/80 dark:bg-[#11141E] border ${
            error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
          } text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm rounded-xl py-2.5 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${isPasswordType ? 'pr-10' : 'pr-3.5'} transition-all focus:outline-none focus:ring-2 ${className}`}
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
      </div>
      {error && <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{error}</p>}
    </div>
  )
}
