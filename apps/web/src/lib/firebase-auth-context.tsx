import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  type User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'
// Removed toast - errors are thrown for components to handle

interface AuthContextType {
  user: FirebaseUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName?: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      // Silent login - no notification needed
    } catch (error: any) {
      console.error('Login error:', error)
      // Let the calling component handle the error display
      throw error
    }
  }

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
      
      if (displayName && firebaseUser) {
        await updateProfile(firebaseUser, { displayName })
      }
      
      // Silent signup - navigation indicates success
    } catch (error: any) {
      console.error('Register error:', error)
      // Let the calling component handle the error display
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      console.log('Starting Google login...')
      console.log('Auth config:', {
        authDomain: auth.config.authDomain,
        apiKey: auth.config.apiKey?.substring(0, 10) + '...',
        currentURL: window.location.href,
        origin: window.location.origin,
        expectedRedirectURI: `${window.location.origin}/__/auth/handler`
      })
      await signInWithPopup(auth, googleProvider)
      // Silent login - navigation indicates success
    } catch (error: any) {
      console.error('Google login error:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        customData: error.customData
      })
      // Let the calling component handle the error display
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      // Silent logout - navigation indicates success
    } catch (error: any) {
      console.error('Logout error:', error)
      // Let the calling component handle the error display
      throw error
    }
  }

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (error) {
      console.error('Error getting ID token:', error)
      return null
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    getIdToken,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}