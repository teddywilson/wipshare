import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useUser, SignIn, SignUp } from '@clerk/clerk-react';
import { apiClient } from './api-client';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

interface AuthContextType {
  user: any;
  userProfile?: any;
  isLoading: boolean;
  loading?: boolean;
  isAuthenticated: boolean;
  needsUsernameSetup?: boolean;
  signOut: () => Promise<void>;
  logout?: () => Promise<void>;
  getToken: () => Promise<string | null>;
  refreshProfile?: () => Promise<void>;
  login?: (email: string, password: string) => Promise<void>;
  register?: (email: string, password: string) => Promise<void>;
  loginWithGoogle?: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </ClerkProvider>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [user, setUser] = useState<any>(null);
  const [needsUsernameSetup, setNeedsUsernameSetup] = useState<boolean>(false);

  // Initialize API client with Clerk token getter
  useEffect(() => {
    const getAuthToken = async () => {
      try {
        // Don't specify a template - use the default session token
        const token = await getToken();
        return token;
      } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
      }
    };

    apiClient.setTokenGetter(getAuthToken);
  }, [getToken]);

  useEffect(() => {
    const sync = async () => {
      if (isLoaded && isSignedIn && clerkUser) {
        setUser({
          id: userId,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          imageUrl: clerkUser.imageUrl,
        });
        try {
          const status = await apiClient.getAuthStatus();
          setNeedsUsernameSetup(Boolean(status?.needsOnboarding));
        } catch (e) {
          // If status endpoint fails with 428/401, assume onboarding needed when signed in
          setNeedsUsernameSetup(true);
        }
      } else {
        setUser(null);
        setNeedsUsernameSetup(false);
      }
    };
    void sync();
  }, [isLoaded, isSignedIn, userId, clerkUser]);

  const value: AuthContextType = {
    user,
    userProfile: user, // For backwards compatibility
    isLoading: !isLoaded,
    loading: !isLoaded, // For backwards compatibility
    isAuthenticated: isSignedIn || false,
    needsUsernameSetup,
    signOut: async () => {
      await signOut();
    },
    logout: async () => {
      await signOut();
    },
    getToken: async () => {
      try {
        const token = await getToken();
        return token;
      } catch (error) {
        console.error('Error getting auth token:', error);
        return null;
      }
    },
    refreshProfile: async () => {
      // Refresh user data if needed
      if (clerkUser) {
        setUser({
          id: userId,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          imageUrl: clerkUser.imageUrl,
        });
        try {
          const status = await apiClient.getAuthStatus();
          setNeedsUsernameSetup(Boolean(status?.needsOnboarding));
        } catch {}
      }
    },
    login: async () => {
      // Clerk handles login via their UI components
      console.log('Use Clerk SignIn component');
    },
    register: async () => {
      // Clerk handles registration via their UI components
      console.log('Use Clerk SignUp component');
    },
    loginWithGoogle: async () => {
      // Clerk handles OAuth via their UI components
      console.log('Use Clerk SignIn component with Google');
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { SignIn, SignUp };