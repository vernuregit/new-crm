import React from 'react'

export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 text-slate-900 dark:text-slate-100 shadow-2xs dark:shadow-xl dark:shadow-black/20 transition-all duration-200 ${
        hover ? 'hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-xs' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}


