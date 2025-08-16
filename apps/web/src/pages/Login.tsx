import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/stytch-auth-context'
import { useStytch } from '@stytch/react'
import { apiClient } from '../lib/api-client'

export default function Login() {
	const { isAuthenticated } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [pendingVerification, setPendingVerification] = useState(false)
	const [verificationCode, setVerificationCode] = useState('')
	const [otpMethodId, setOtpMethodId] = useState<string | null>(null)

	const stytch = useStytch()

	useEffect(() => {
		if (isAuthenticated) {
			const invitationRedirect = sessionStorage.getItem('invitationRedirect')
			if (invitationRedirect) navigate(invitationRedirect)
		}
	}, [isAuthenticated, navigate])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError(null)

		try {
			// Step 1: request OTP code
			if (!pendingVerification) {
				const res: any = await stytch.otps.email.loginOrCreate(email)
				setOtpMethodId(res?.method_id || null)
				setPendingVerification(true)
				return
			}

			// Step 2: verify OTP code
			if (!otpMethodId) {
				setError('Missing verification method. Please try again.')
				setPendingVerification(false)
				return
			}

			const authRes: any = await stytch.otps.authenticate(otpMethodId, verificationCode)

			const sessionJwt: string | undefined = authRes?.session_jwt
			if (sessionJwt) sessionStorage.setItem('stytch_session_jwt', sessionJwt)

			try {
				const status = await apiClient.getAuthStatus()
				if (status?.needsOnboarding) {
					navigate('/onboarding')
					return
				}
			} catch {}

			const invitationRedirect = sessionStorage.getItem('invitationRedirect')
			if (invitationRedirect) {
				navigate(invitationRedirect)
			} else {
				navigate('/dashboard')
			}
		} catch (err: any) {
			setError(err?.errors?.[0]?.message || err?.message || 'Authentication failed')
		} finally {
			setLoading(false)
		}
	}

// Magic links flow does not verify codes here; SSOCallback consumes the link

	const handleGoogleSignIn = async () => {
		setLoading(true)
		setError(null)
		try {
			// ensure a clean slate before starting OAuth (avoid stale PKCE state)
			// do NOT clear entire storage to avoid losing app state; remove only Stytch keys
			Object.keys(localStorage).forEach((k) => { if (k.startsWith('stytch')) localStorage.removeItem(k) })
			await stytch.oauth.google.start({
				login_redirect_url: `${window.location.origin}/sso-callback`,
				signup_redirect_url: `${window.location.origin}/sso-callback`,
			})
		} catch (err: any) {
			setError(err?.message || 'Failed to sign in with Google')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen bg-white flex items-center justify-center px-4 sm:px-6">
			<div className="w-full max-w-sm">
				<div className="mb-8 text-center">
					<Link to="/" className="text-sm font-mono inline-block">
						wipshare
					</Link>
				</div>

				<h1 className="text-lg font-mono mb-6 text-center">log in</h1>

				{error && (
					<div className="mb-3 text-xs text-red-600 font-mono text-center">{error}</div>
				)}

				{/* OAuth first (Notion-style) */}
				<button
					onClick={handleGoogleSignIn}
					disabled={loading || pendingVerification}
					className="w-full border border-gray-300 py-2 text-sm hover:bg-gray-50 disabled:bg-gray-100 font-mono flex items-center justify-center gap-2 transition-colors mb-4"
				>
					<svg className="w-4 h-4" viewBox="0 0 24 24">
						<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
						<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
						<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
						<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
					</svg>
					continue with google
				</button>

				<div className="my-4 text-center text-xs text-gray-400 font-mono">or continue with email</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm text-gray-600 mb-1 font-mono">
							email
						</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-400 font-mono"
							required
							autoComplete="email"
							disabled={pendingVerification}
						/>
					</div>

					{pendingVerification && (
						<div>
							<label className="block text-sm text-gray-600 mb-1 font-mono">
								verification code
							</label>
							<input
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								value={verificationCode}
								onChange={(e) => setVerificationCode(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-400 font-mono tracking-widest"
								placeholder="123456"
								maxLength={8}
								autoFocus
							/>
							<p className="mt-2 text-xs text-gray-500 font-mono">Enter the code we emailed to {email}.</p>
						</div>
					)}

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-gray-900 text-white py-2 text-sm hover:bg-gray-800 disabled:bg-gray-400 font-mono transition-colors"
					>
						{loading ? 'loading...' : pendingVerification ? 'verify code' : 'continue'}
					</button>
				</form>
			</div>
		</div>
	)
}