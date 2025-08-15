import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export default function Landing() {
  const { loginWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      // Error is handled in the auth context
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 animate-fade-in">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-sm font-mono hover:scale-105 transition-transform duration-200">
              wipshare
            </Link>
            <Link
              to="/login"
              className="text-sm font-mono text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main - Centered content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h1 className="text-3xl font-mono mb-4 animate-slide-up">wipshare</h1>

          <p className="text-lg text-gray-700 mb-8 animate-slide-up" style={{ animationDelay: '400ms' }}>
            organize and develop music before it's released.
          </p>

          <div className="space-y-3 mb-10 text-sm text-gray-600 font-mono">
            <p className="animate-slide-up" style={{ animationDelay: '600ms' }}>→ upload work-in-progress tracks</p>
            <p className="animate-slide-up" style={{ animationDelay: '700ms' }}>→ share privately with collaborators</p>
            <p className="animate-slide-up" style={{ animationDelay: '800ms' }}>→ track versions and iterations</p>
            <p className="animate-slide-up" style={{ animationDelay: '900ms' }}>→ everything stays within your network</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 animate-slide-up" style={{ animationDelay: '1000ms' }}>
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 bg-white text-gray-900 text-sm font-mono hover:bg-gray-50 hover:scale-105 transition-all duration-200 hover:shadow-sm"
            >
              get started
            </Link>

            <button
              onClick={handleGoogleSignIn}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-300 bg-white text-gray-900 text-sm font-mono hover:bg-gray-50 hover:scale-105 transition-all duration-200 hover:shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              continue with google
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 animate-fade-in" style={{ animationDelay: '1200ms' }}>
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500 font-mono space-y-2 sm:space-y-0">
            <span>© 2025 wipshare</span>
            <div className="space-x-6">
              <a href="#" className="hover:text-gray-700 transition-colors duration-200">
                about
              </a>
              <a
                href="mailto:hello@wipshare.com"
                className="hover:text-gray-700 transition-colors duration-200"
              >
                contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
