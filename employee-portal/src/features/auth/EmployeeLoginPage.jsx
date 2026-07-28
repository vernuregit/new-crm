import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { useUserStore } from '../../stores/userStore'
import { loginWithEmail, signupWithEmail, fetchCustomClaims } from '../../shared/services/authService'

export const EmployeeLoginPage = () => {
  const navigate = useNavigate()
  const { setUser } = useUserStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRealLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both staff work email and password.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const firebaseUser = await loginWithEmail(email, password)
      const claims = await fetchCustomClaims(firebaseUser)
      setUser(
        firebaseUser,
        null,
        claims || { orgId: 'org_real', role: 'employee', tier: 'company' }
      )
      navigate('/dashboard')
    } catch (err) {
      console.error('Firebase Auth error:', err)
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.')
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Account does not exist or credentials are invalid. Please contact the administrator.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.')
      } else {
        setError(err.message || 'Authentication failed. Please check credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1117] flex items-center justify-center p-4 relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-500/10 dark:bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md p-8 relative z-10 border-purple-200/80 dark:border-purple-500/30 shadow-xl dark:shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 items-center justify-center border border-purple-200 dark:border-purple-500/30 mb-1">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Employee Staff Portal</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sprint Tasks, Time Tracker & Attendance Workspace</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRealLogin} className="space-y-4">
          <Input
            label="Staff Work Email"
            type="email"
            placeholder="staff@company.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full mt-2 bg-purple-600 hover:bg-purple-500" disabled={loading} icon={ArrowRight}>
            {loading ? 'Authenticating Staff...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
