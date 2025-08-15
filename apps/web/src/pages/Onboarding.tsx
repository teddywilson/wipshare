import { useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import UsernameSetup from '../components/UsernameSetup'
import { apiClient } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'

export default function Onboarding() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const { isAuthenticated, needsUsernameSetup } = useAuth()

  useEffect(() => {
    const check = async () => {
      try {
        const status = await apiClient.getAuthStatus()
        if (!status?.needsOnboarding) {
          navigate('/dashboard')
          return
        }
      } catch {
        // If status fails, leave user here; the UsernameSetup will likely succeed
      } finally {
        setChecking(false)
      }
    }
    void check()
  }, [navigate])

  // Perform redirects only after hooks are declared to avoid hook order mismatches
  if (isAuthenticated && !needsUsernameSetup) {
    return <Navigate to="/dashboard" />
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-500 font-mono">checking your account…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md mx-auto p-6">
        <UsernameSetup onComplete={() => navigate('/dashboard')} />
      </div>
    </div>
  )
}


