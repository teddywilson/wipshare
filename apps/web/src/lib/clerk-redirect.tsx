import { useSignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

export function useClerkRedirect() {
  const { signIn, isLoaded } = useSignIn();
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    if (!isLoaded || !signIn) return;

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard'
      });
    } catch (err) {
      console.error('OAuth error:', err);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!isLoaded || !signIn) return;

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    }
  };

  return {
    signInWithGoogle,
    signInWithEmail,
    isLoaded
  };
}