import React, { createContext, useContext, useEffect, useState } from 'react'
import { StytchProvider, useStytch } from '@stytch/react'
import { StytchHeadlessClient } from '@stytch/vanilla-js/headless'
import { apiClient } from './api-client'

interface AuthContextType {
  user: any
  userProfile?: any
  isLoading: boolean
  isAuthenticated: boolean
  needsUsernameSetup?: boolean
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
  refreshProfile?: () => Promise<void>
  setSessionJwt?: (token: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STYTCH_PUBLIC_TOKEN = import.meta.env.VITE_STYTCH_PUBLIC_TOKEN
if (!STYTCH_PUBLIC_TOKEN) {
  throw new Error('Missing VITE_STYTCH_PUBLIC_TOKEN')
}

// Create a single Stytch client for the whole app lifetime to avoid duplicate warnings
const stytchClientSingleton = new StytchHeadlessClient(STYTCH_PUBLIC_TOKEN)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <StytchProvider stytch={stytchClientSingleton}>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </StytchProvider>
  )
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const stytch = useStytch()
  const [user, setUser] = useState<any>(null)
  const [dbUser, setDbUser] = useState<any>(null)
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState<boolean>(false)
  const [initializing, setInitializing] = useState<boolean>(true)
  const [sessionJwt, setSessionJwt] = useState<string | null>(() => sessionStorage.getItem('stytch_session_jwt'))
  const [bootstrapComplete, setBootstrapComplete] = useState<boolean>(false)

  // Always provide a token getter that reads the latest value from sessionStorage
  useEffect(() => {
    const getAuthToken = async () => sessionStorage.getItem('stytch_session_jwt')
    apiClient.setTokenGetter(getAuthToken)
  }, [])

  useEffect(() => {
    let cancelled = false
    const bootstrap = async () => {
      setInitializing(true)
      try {
        if (sessionJwt) {
          try {
            const status = await apiClient.getAuthStatus()
            if (cancelled) return
            const needs = Boolean(status?.needsOnboarding)
            setNeedsUsernameSetup(needs)
            if (!needs) {
              const me = await apiClient.getCurrentUser()
              if (!cancelled) setDbUser(me?.user || null)
              if (!cancelled) setUser(me?.user || null)
            } else {
              setDbUser(null)
            }
          } catch {
            if (!cancelled) {
              setNeedsUsernameSetup(true)
              setDbUser(null)
            }
          }
        } else {
          setUser(null)
          setNeedsUsernameSetup(false)
          setDbUser(null)
        }
      } finally {
        if (!cancelled) setInitializing(false)
        if (!cancelled) setBootstrapComplete(true)
      }
    }
    void bootstrap()
    return () => { cancelled = true }
  }, [sessionJwt])

  const value: AuthContextType = {
    user,
    userProfile: dbUser || undefined,
    isLoading: !bootstrapComplete || initializing,
    isAuthenticated: Boolean(user),
    needsUsernameSetup,
    signOut: async () => {
      setUser(null)
      setDbUser(null)
      setNeedsUsernameSetup(false)
      setSessionJwt(null)
      sessionStorage.removeItem('stytch_session_jwt')
    },
    getToken: async () => sessionJwt,
    refreshProfile: async () => {
      try {
        const status = await apiClient.getAuthStatus()
        setNeedsUsernameSetup(Boolean(status?.needsOnboarding))
        if (!Boolean(status?.needsOnboarding)) {
          const me = await apiClient.getCurrentUser()
          setDbUser(me?.user || null)
        }
      } catch {}
    },
    setSessionJwt: (token: string | null) => {
      setSessionJwt(token)
      if (token) {
        sessionStorage.setItem('stytch_session_jwt', token)
      } else {
        sessionStorage.removeItem('stytch_session_jwt')
      }
    }
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}


