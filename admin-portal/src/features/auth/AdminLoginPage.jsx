import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Mail, Lock, User, ArrowRight, AlertCircle, UserPlus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { useUserStore } from '../../stores/userStore'
import { loginWithEmail, signupWithEmail, fetchCustomClaims } from '../../shared/services/authService'

export const AdminLoginPage = () => {
  const navigate = useNavigate()
  const { setUser } = useUserStore()

  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter work email and password.')
      return
    }

    if (isRegisterMode && !fullName.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      let firebaseUser
      if (isRegisterMode) {
        // Register new Admin user in Firebase Auth
        firebaseUser = await signupWithEmail(email, password, fullName)
      } else {
        // Sign in existing Admin user
        firebaseUser = await loginWithEmail(email, password)
      }

      const claims = await fetchCustomClaims(firebaseUser)
      setUser(
        firebaseUser,
        null,
        claims || { orgId: 'org_real', role: 'owner', tier: 'company' }
      )
      navigate('/dashboard')
    } catch (err) {
      console.error('Firebase Auth error:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in instead.')
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.')
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Click "Register New Account" to create one.')
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.')
      } else {
        setError(err.message || 'Authentication failed. Please check credentials.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1117] flex items-center justify-center p-4 relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md p-8 relative z-10 border-indigo-200/80 dark:border-indigo-500/30 shadow-xl dark:shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 items-center justify-center border border-indigo-200 dark:border-indigo-500/30 mb-1">
            <Crown className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {isRegisterMode ? 'Register New Admin Account' : 'Founder & Admin Login'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isRegisterMode ? 'Create executive account in Firebase' : 'Executive Workspace & Operations Management'}
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            className={`py-2 rounded-lg font-medium transition-colors ${!isRegisterMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            onClick={() => { setIsRegisterMode(false); setError(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`py-2 rounded-lg font-medium transition-colors ${isRegisterMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            onClick={() => { setIsRegisterMode(true); setError(''); }}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <Input
              label="Full Name"
              placeholder="e.g. Alex Rivera"
              icon={User}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}

          <Input
            label="Admin Work Email"
            type="email"
            placeholder="admin@yourcompany.com"
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

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            disabled={loading}
            icon={isRegisterMode ? UserPlus : ArrowRight}
          >
            {loading
              ? isRegisterMode ? 'Creating Account in Firebase...' : 'Authenticating...'
              : isRegisterMode ? 'Register Admin Account' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
