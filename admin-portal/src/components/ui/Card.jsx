import React from 'react'

export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-[#181C27] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 text-slate-900 dark:text-slate-100 shadow-sm dark:shadow-xl dark:shadow-black/20 transition-colors ${
        hover ? 'transition-all duration-200 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:shadow-indigo-500/10' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
