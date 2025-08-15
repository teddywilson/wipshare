import React, { createContext, useContext, useEffect, useState } from 'react';
import { ClerkProvider, useAuth as useClerkAuth, useUser, SignIn, SignUp } from '@clerk/clerk-react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

interface AuthContextType {
  user: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
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

  useEffect(() => {
    if (isLoaded && isSignedIn && clerkUser) {
      setUser({
        id: userId,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        name: clerkUser.fullName || clerkUser.firstName || 'User',
        imageUrl: clerkUser.imageUrl,
      });
    } else {
      setUser(null);
    }
  }, [isLoaded, isSignedIn, userId, clerkUser]);

  const getAuthToken = async () => {
    try {
      const token = await getToken({ template: 'backend' });
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn || false,
    signOut: async () => {
      await signOut();
    },
    getToken: getAuthToken,
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