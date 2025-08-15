import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

export default function Login() {
  const { login, register, loginWithGoogle, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSignUp, setIsSignUp] = useState(location.state?.isSignUp || false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  // Check for invitation redirect after successful login
  useEffect(() => {
    if (user) {
      const invitationRedirect = sessionStorage.getItem('invitationRedirect')
      if (invitationRedirect) {
        // Don't remove it here, let the invitation page handle it
        navigate(invitationRedirect)
      }
    }
  }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        await register(email, password, username, displayName || email.split('@')[0])
      } else {
        await login(email, password)
      }
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="text-sm font-mono inline-block">
            wipshare
          </Link>
        </div>

        <h1 className="text-lg font-mono mb-6 text-center">
          {isSignUp ? 'create account' : 'sign in'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1 font-mono">
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-400 font-mono"
              required
              autoComplete="email"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-mono">
                username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-400 font-mono"
                placeholder="your_username"
                required
                pattern="[a-z0-9_]+"
                minLength={3}
                maxLength={20}
                autoComplete="username"
              />
              <p className="text-xs text-gray-500 mt-1 font-mono">
                3-20 characters • lowercase, numbers, underscores only
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1 font-mono">
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-400 font-mono"
              required
              minLength={8}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-mono">
                name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-400 font-mono"
                autoComplete="name"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white py-2 text-sm hover:bg-gray-800 disabled:bg-gray-400 font-mono transition-colors"
          >
            {loading ? 'loading...' : isSignUp ? 'create account' : 'sign in'}
          </button>
        </form>

        <div className="my-6 text-center text-xs text-gray-500 font-mono">or</div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full border border-gray-300 py-2 text-sm hover:bg-gray-50 disabled:bg-gray-100 font-mono flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          continue with google
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm text-gray-600 hover:text-gray-900 font-mono"
          >
            {isSignUp ? 'already have an account?' : "don't have an account?"}
          </button>
        </div>
      </div>
    </div>
  )
}