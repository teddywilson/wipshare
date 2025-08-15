import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UsernameSetup from '../components/UsernameSetup'
import { apiClient } from '../lib/api-client'

export default function Onboarding() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

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


