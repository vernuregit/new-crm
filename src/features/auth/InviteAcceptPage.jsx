import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { UserCheck, Shield, CheckCircle2 } from 'lucide-react'
import { Button } from '../../shared/components/ui/Button'
import { Card } from '../../shared/components/ui/Card'
import { Input } from '../../shared/components/ui/Input'

export const InviteAcceptPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const orgId = searchParams.get('org')

  const [password, setPassword] = useState('')
  const [isAccepted, setIsAccepted] = useState(false)

  const handleAcceptInvite = (e) => {
    e.preventDefault()
    setIsAccepted(true)
    setTimeout(() => {
      navigate('/dashboard')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#0F1117] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/15 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-md p-8 relative z-10 border-slate-800 shadow-2xl">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 items-center justify-center mb-2 border border-emerald-500/30">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Team Workspace Invitation</h2>
          <p className="text-xs text-slate-400">You have been invited to join organization <strong className="text-slate-200">{orgId || 'Acme Services'}</strong></p>
        </div>

        {isAccepted ? (
          <div className="text-center space-y-3 py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h3 className="font-bold text-slate-100 text-lg">Invitation Accepted!</h3>
            <p className="text-xs text-slate-400">Refreshing custom claims & redirecting to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleAcceptInvite} className="space-y-4">
            <Input
              label="Create Account Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" className="w-full" icon={Shield}>
              Accept Invitation & Join Team
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
