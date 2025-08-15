import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle the OAuth callback using Clerk's built-in method
        await handleRedirectCallback({});
        
        // Check for invitation redirect
        const invitationRedirect = sessionStorage.getItem('invitationRedirect');
        if (invitationRedirect) {
          navigate(invitationRedirect);
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        // If there's an error, redirect to login
        navigate('/login');
      }
    };

    handleCallback();
  }, [handleRedirectCallback, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-black"></div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Completing sign in...</h2>
        <p className="text-gray-500 mt-2">Please wait while we set up your workspace.</p>
      </div>
    </div>
  );
}