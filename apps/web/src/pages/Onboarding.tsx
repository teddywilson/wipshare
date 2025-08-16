import { useEffect, useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import UsernameSetup from '../components/UsernameSetup'
import { apiClient } from '../lib/api-client'
import { useAuth } from '../lib/stytch-auth-context'

export default function Onboarding() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const { isAuthenticated, needsUsernameSetup, signOut, refreshProfile } = useAuth()
  const [finalizing, setFinalizing] = useState(false)

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
  // Obsolete route now that onboarding runs inside AuthenticatedLayout, but keep redirect for direct hits
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
    <div className="min-h-screen bg-white grid place-items-center">
      <div className="w-full max-w-md px-6 transition-all duration-300 ease-out">
        <div className="text-center mb-8">
          <Link to="/" className="text-sm font-mono">wipshare</Link>
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-xl font-mono mb-2">let’s get you set up</h1>
          <p className="text-sm text-gray-600 font-mono">choose a username to finish creating your account</p>
        </div>
        <div className="transition-all duration-300 ease-out transform opacity-100 translate-y-0">
          <UsernameSetup
            variant="card"
            onComplete={async () => {
              try {
                setFinalizing(true)
                await refreshProfile?.()
                // small fade transition into the app
                const root = document.getElementById('root')
                if (root) root.classList.add('opacity-0')
                setTimeout(() => navigate('/dashboard'), 180)
              } finally {
                setFinalizing(false)
              }
            }}
          />
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={async () => { await signOut(); navigate('/login'); }}
              className="text-xs font-mono text-gray-600 hover:text-gray-900"
            >
              use a different account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


