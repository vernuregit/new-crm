import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crown, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card } from '../../components/ui/Card'
import { useUserStore } from '../../stores/userStore'
import { loginWithEmail, fetchCustomClaims, getUserDoc, logoutUser } from '../../shared/services/authService'

export const AdminLoginPage = () => {
  const navigate = useNavigate()
  const { setUser } = useUserStore()

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

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Sign in existing Admin user
      const firebaseUser = await loginWithEmail(email, password)

      // Verify user role: reject employee accounts from logging into Admin portal
      const userDoc = await getUserDoc(firebaseUser.uid)
      if (userDoc && (userDoc.role === 'employee' || (userDoc.roleName && userDoc.role !== 'owner' && userDoc.role !== 'admin'))) {
        await logoutUser()
        setError('Access Denied: This account is an Employee account. Please log in using the Employee Portal.')
        setLoading(false)
        return
      }

      const claims = await fetchCustomClaims(firebaseUser)
      const userRole = userDoc?.role || (claims && claims.role) || 'owner'
      setUser(
        firebaseUser,
        userDoc || null,
        { orgId: 'org_real', role: userRole, tier: 'company', ...claims }
      )
      navigate('/dashboard')
    } catch (err) {
      console.error('Firebase Auth error:', err)
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect email or password. Please try again.')
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.')
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
            Founder & Admin Login
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Executive Workspace & Operations Management
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            icon={ArrowRight}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
