import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  type User as FirebaseUser,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import toast from 'react-hot-toast'

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
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
      toast.success('Welcome back!')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error('Failed to sign in')
      throw error
    }
  }

  const register = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (error: any) {
      console.error('Register error:', error)
      toast.error('Failed to create account')
      throw error
    }
  }

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error: any) {
      console.error('Google login error:', error)
      toast.error('Failed to sign in with Google')
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
    } catch (error: any) {
      console.error('Logout error:', error)
      toast.error('Failed to sign out')
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