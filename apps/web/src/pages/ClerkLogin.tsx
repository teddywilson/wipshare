import { SignIn } from '@clerk/clerk-react';

export default function ClerkLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <SignIn 
          routing="path"
          path="/login"
          signUpUrl="/signup"
          afterSignInUrl="/dashboard"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-black hover:bg-gray-800 text-white',
              card: 'shadow-none',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton: 'bg-white border border-gray-300 hover:bg-gray-50',
              socialButtonsBlockButtonText: 'text-gray-700',
              formFieldLabel: 'text-gray-700',
              formFieldInput: 'border-gray-300',
              footer: 'hidden'
            }
          }}
        />
      </div>
    </div>
  );
}