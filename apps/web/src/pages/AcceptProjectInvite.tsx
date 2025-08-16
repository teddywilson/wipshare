import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useProjectInvitationDetails, useAcceptProjectInvitation } from '../hooks/useProjectMemberQueries'
import { Users, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { useAuth } from '../lib/stytch-auth-context'
import toast from 'react-hot-toast'

interface ProjectInvitation {
  id: string
  email: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  project: {
    id: string
    title: string
    description?: string
  }
  inviter: {
    displayName?: string
    username: string
  }
}

export default function AcceptProjectInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, loading: authLoading, login, register, loginWithGoogle } = useAuth()
  const [hasAttemptedAccept, setHasAttemptedAccept] = useState(false)
  
  // Form state
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  
  const { data: invitationData, isLoading, error } = useProjectInvitationDetails(token)
  const invitation = invitationData as ProjectInvitation | undefined
  const acceptInvitationMutation = useAcceptProjectInvitation()
  
  // Check if user is logged in with a different email than the invitation was sent to
  const isDifferentAccount = user && invitation && user.email !== invitation.email
  
  // Auto-accept if user is already logged in and invitation is loaded
  useEffect(() => {
    if (user && invitation && !hasAttemptedAccept) {
      setHasAttemptedAccept(true)
      handleAcceptInvitation()
    }
  }, [user, invitation, hasAttemptedAccept])
  
  const handleAcceptInvitation = async () => {
    if (!token || acceptInvitationMutation.isPending) return
    
    try {
      const result = await acceptInvitationMutation.mutateAsync(token)
      navigate(`/projects/${result.project.id}`)
      toast.success('Successfully joined the project!')
    } catch (error: any) {
      console.error('Failed to accept invitation:', error)
      const errorMessage = error?.response?.data?.error || 'Failed to accept invitation'
      
      // If invitation was already accepted or user is already a member, navigate to projects
      if (errorMessage.includes('already') || errorMessage.includes('member') || errorMessage.includes('accepted')) {
        navigate('/projects')
        toast('You are already a member of this project', { icon: 'ℹ️' })
      } else if (errorMessage.includes('expired')) {
        // Don't reset for expired invitations
        toast.error('This invitation has expired')
      } else {
        toast.error(errorMessage)
        // Reset only for other errors so user can try again
        setHasAttemptedAccept(false)
      }
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    try {
      if (isSignUp) {
        await register(email, password)
        // TODO: Set username and display name after registration via profile API
      } else {
        await login(email, password)
      }
      // After successful auth, the useEffect will auto-accept the invitation
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setFormLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setFormLoading(true)
    try {
      await loginWithGoogle()
      // After successful auth, the useEffect will auto-accept the invitation
    } catch (error) {
      // Error is handled in the auth context
    } finally {
      setFormLoading(false)
    }
  }
  
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading invitation...
        </div>
      </div>
    )
  }
  
  if (error) {
    const errorMessage = (error as any)?.response?.data?.error || 'Invalid or expired invitation'
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <Link to="/" className="text-sm font-mono inline-block">
              wipshare
            </Link>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded p-6">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-sm text-gray-600 mb-4">{errorMessage}</p>
            <Link 
              to="/"
              className="inline-block px-4 py-2 bg-black text-white text-sm font-mono hover:bg-gray-800 transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  if (!invitation) {
    return null
  }
  
  // If user is already logged in and accepting, show loading state
  if (user && (hasAttemptedAccept || acceptInvitationMutation.isPending)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono text-gray-600">
            Joining {invitation.project.title}...
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side - Invitation details */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 p-12 flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="mb-8">
            <Link to="/" className="text-sm font-mono inline-block text-gray-600 hover:text-black transition-colors">
              ← back to wipshare
            </Link>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-8 h-8 text-gray-600" />
              <div>
                <h2 className="text-lg font-semibold">You're invited!</h2>
                <p className="text-sm text-gray-600">Join a collaborative project</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-mono text-gray-500 uppercase mb-1">Project</p>
                <p className="font-medium text-lg">{invitation.project.title}</p>
                {invitation.project.description && (
                  <p className="text-sm text-gray-600 mt-1">{invitation.project.description}</p>
                )}
              </div>
              
              <div>
                <p className="text-xs font-mono text-gray-500 uppercase mb-1">Invited by</p>
                <p className="text-sm">{invitation.inviter.displayName || invitation.inviter.username}</p>
              </div>
              
              <div>
                <p className="text-xs font-mono text-gray-500 uppercase mb-1">Your role</p>
                <div className="inline-flex items-center gap-2">
                  <span className="text-sm font-medium capitalize">
                    {invitation.role.toLowerCase()}
                  </span>
                  <span className="text-xs text-gray-500">
                    {invitation.role === 'VIEWER' && '• View project and tracks'}
                    {invitation.role === 'EDITOR' && '• Edit project and manage tracks'}
                    {invitation.role === 'OWNER' && '• Full control'}
                  </span>
                </div>
              </div>
              
              {isDifferentAccount && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                  <p className="text-xs text-amber-800">
                    Note: Invitation was sent to {invitation.email}, 
                    but you'll join as {user.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-sm font-mono">wipshare</h1>
          </div>
          
          {/* Mobile: Show compact invitation info */}
          <div className="lg:hidden mb-6 p-4 bg-gray-50 rounded">
            <p className="text-xs font-mono text-gray-500 mb-1">You're invited to:</p>
            <p className="font-medium">{invitation.project.title}</p>
            <p className="text-xs text-gray-600 mt-1">
              by {invitation.inviter.displayName || invitation.inviter.username}
            </p>
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-mono text-center">
              {isSignUp ? 'create account' : 'sign in'}
            </h2>
            <p className="text-sm text-gray-600 text-center mt-2">
              to accept your invitation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <input
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400"
                  required
                  disabled={formLoading}
                />
                <input
                  type="text"
                  placeholder="display name (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400"
                  disabled={formLoading}
                />
              </>
            )}
            
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400"
              required
              disabled={formLoading}
            />
            
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400"
              required
              disabled={formLoading}
            />
            
            <button
              type="submit"
              disabled={formLoading}
              className="w-full px-4 py-2 bg-black text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
            >
              {formLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'create account' : 'sign in'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="my-6 text-center text-sm font-mono text-gray-400">or</div>

          <button
            onClick={handleGoogleSignIn}
            disabled={formLoading}
            className="w-full px-4 py-2 border border-gray-300 font-mono text-sm hover:border-gray-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm font-mono text-gray-600 hover:text-black transition-colors"
            >
              {isSignUp ? "already have an account?" : "don't have an account?"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}