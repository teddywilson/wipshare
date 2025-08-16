import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStytch } from '@stytch/react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../lib/stytch-auth-context';

export default function SSOCallback() {
  const stytch = useStytch();
  const navigate = useNavigate();
  const { setSessionJwt } = useAuth();
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle Stytch callback (OAuth or Magic Link)
        const url = new URL(window.location.href)
        const tokenType = url.searchParams.get('stytch_token_type')
        let sessionJwt: string | undefined
        console.debug('[SSO] callback params', Object.fromEntries(url.searchParams.entries()))

        if (tokenType === 'magic_links') {
          const token = url.searchParams.get('token') || ''
          const res = await stytch.magicLinks.authenticate(token, { session_duration_minutes: 60 } as any)
          sessionJwt = (res as any)?.session_jwt
        } else {
          const oauthToken = url.searchParams.get('oauth_token') || url.searchParams.get('token') || ''
          if (!oauthToken) throw new Error('Missing oauth_token in callback URL')
          const res = await stytch.oauth.authenticate(oauthToken, { session_duration_minutes: 60 } as any)
          sessionJwt = (res as any)?.session_jwt
        }

        if (sessionJwt) {
          sessionStorage.setItem('stytch_session_jwt', sessionJwt)
          setSessionJwt?.(sessionJwt)
        }
        console.debug('[SSO] session_jwt set?', Boolean(sessionJwt))
        
        // After OAuth, check onboarding status and stay in loading state until decided
        // Make one strong status check. If it fails unauthorized, force redirect to login.
        try {
          const status = await apiClient.getAuthStatus();
          if (status?.needsOnboarding) {
            navigate('/onboarding')
            return;
          }
        } catch (e) {
          // If we somehow don't have a valid token, send the user back to login
          navigate('/login')
          return
        }

        const invitationRedirect = sessionStorage.getItem('invitationRedirect');
        if (invitationRedirect) {
          navigate(invitationRedirect)
        } else {
          navigate('/dashboard')
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        // If there's an error, redirect to login
        navigate('/login')
      } finally {
        setLoading(false)
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-black" />
    </div>
  );
}