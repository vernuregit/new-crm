import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useUserStore } from '../../stores/userStore'
import { Spinner } from '../ui/Spinner'

export const AuthGuard = () => {
  const { user, isLoading } = useUserStore()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" />
        <span className="text-xs text-slate-400 font-medium">Verifying Session Security...</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
