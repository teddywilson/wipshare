import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { 
  type User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { apiClient } from './api-client'
import toast from 'react-hot-toast'
import { ManualGoogleOAuth, isOAuthCallback } from './google-oauth'

interface UserProfile {
  id: string
  email: string
  username: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  verified: boolean
  createdAt: string
  firebaseUid: string
  stats?: {
    tracks: number
    followers: number
    following: number
  }
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  needsUsernameSetup: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, username: string, displayName?: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Function to fetch user profile
  const refreshProfile = async () => {
    if (!user) {
      setUserProfile(null)
      return
    }

    setProfileLoading(true)
    try {
      const response = await apiClient.getCurrentUser()
      setUserProfile(response.user)
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      setUserProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  useEffect(() => {
    // Check if we're on OAuth callback page with manual OAuth
    if (isOAuthCallback()) {
      const manualOAuth = new ManualGoogleOAuth('wipshare-stg')
      manualOAuth.handleCallback(auth)
        .then((result) => {
          if (result?.user) {
            console.log('Manual OAuth sign-in successful:', result.user.email)
            toast.success('Welcome back!')
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname)
          }
        })
        .catch((error) => {
          console.error('Manual OAuth callback error:', error)
        })
    }
    
    // Check for redirect result from Firebase SDK
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Google sign-in successful via redirect:', result.user.email)
          toast.success('Welcome back!')
        }
      })
      .catch((error) => {
        if (error?.code) {
          console.error('Redirect sign-in error:', error)
          if (error.code === 'auth/redirect_uri_mismatch') {
            console.error('Redirect URI mismatch details:', error.customData)
            console.error('Expected redirect URI:', `${window.location.origin}/__/auth/handler`)
          }
        }
      })
    
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Update the API client with the current user
      apiClient.setUser(firebaseUser)
      
      // Update local state
      setUser(firebaseUser)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  // Fetch profile when user changes
  useEffect(() => {
    if (user && !loading) {
      refreshProfile()
    } else if (!user) {
      setUserProfile(null)
    }
  }, [user, loading])

  // Check if user needs username setup (temporary username detected)
  const needsUsernameSetup = userProfile ? 
    /^[a-z0-9_]+_[a-z0-9]{4}$/.test(userProfile.username) : false

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // API client will be updated automatically via onAuthStateChanged
      toast.success('Welcome back!')
    } catch (error: any) {
      console.error('Login error:', error)
      const message = error.code === 'auth/invalid-credential' 
        ? 'Invalid email or password'
        : 'Failed to sign in'
      toast.error(message)
      throw error
    }
  }

  const register = async (email: string, password: string, username: string, displayName?: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      if (displayName && result.user) {
        await updateProfile(result.user, { displayName })
      }
      
      // Wait for API client to be updated via onAuthStateChanged
      // Then create the user profile with username
      setTimeout(async () => {
        try {
          await apiClient.createUserProfile({ username, displayName })
          console.log('User profile created successfully')
        } catch (profileError) {
          console.error('Failed to create user profile:', profileError)
          toast.error('Account created but username setup failed. Please update in settings.')
        }
      }, 1000)
      
      toast.success('Account created successfully!')
    } catch (error: any) {
      console.error('Registration error:', error)
      const message = error.code === 'auth/email-already-in-use'
        ? 'Email already in use'
        : 'Failed to create account'
      toast.error(message)
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      console.log('Starting Google login from main auth...')
      console.log('Auth config:', {
        authDomain: auth.config.authDomain,
        apiKey: auth.config.apiKey?.substring(0, 10) + '...',
        currentURL: window.location.href,
        origin: window.location.origin,
        expectedRedirectURI: `${window.location.origin}/__/auth/handler`,
        hostname: window.location.hostname
      })
      
      // Check if we should use manual OAuth (for debugging redirect_uri issues)
      const USE_MANUAL_OAUTH = false // Set to true to debug OAuth issues
      
      if (USE_MANUAL_OAUTH) {
        console.log('Using manual OAuth flow...')
        const manualOAuth = new ManualGoogleOAuth('wipshare-stg')
        await manualOAuth.signIn()
        // This will redirect, so no code after this will run
        return
      }
      
      // Try popup first for better UX, fallback to redirect if blocked
      try {
        // Attempt popup sign-in
        const result = await signInWithPopup(auth, googleProvider)
        console.log('Google sign-in successful via popup:', result.user.email)
        toast.success('Welcome back!')
      } catch (popupError: any) {
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/cancelled-popup-request') {
          console.log('Popup blocked or cancelled, trying redirect...')
          // Fallback to redirect
          await signInWithRedirect(auth, googleProvider)
          // User will be redirected and result will be handled in useEffect
        } else if (popupError.code === 'auth/redirect_uri_mismatch') {
          console.error('Redirect URI mismatch, falling back to manual OAuth...')
          // Use manual OAuth as last resort
          const manualOAuth = new ManualGoogleOAuth('wipshare-stg')
          await manualOAuth.signIn()
        } else {
          // Re-throw if it's a different error
          throw popupError
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error)
      console.error('Error code:', error.code)
      console.error('Error customData:', error.customData)
      
      if (error.code === 'auth/popup-blocked') {
        // This shouldn't happen since we handle it above, but just in case
        toast.error('Popup was blocked. Redirecting to sign-in...')
      } else if (error.code === 'auth/redirect_uri_mismatch') {
        console.log('Attempting manual OAuth due to redirect_uri_mismatch...')
        const manualOAuth = new ManualGoogleOAuth('wipshare-stg')
        await manualOAuth.signIn()
      } else if (error.code !== 'auth/cancelled-popup-request') {
        toast.error('Failed to sign in with Google')
      }
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      // API client will be updated automatically via onAuthStateChanged
    } catch (error: any) {
      console.error('Logout error:', error)
      toast.error('Failed to sign out')
      throw error
    }
  }

  const value = {
    user,
    userProfile,
    loading,
    profileLoading,
    needsUsernameSetup,
    login,
    register,
    loginWithGoogle,
    logout,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext