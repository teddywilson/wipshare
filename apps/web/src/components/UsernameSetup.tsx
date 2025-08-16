import { useState } from 'react'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

interface UsernameSetupProps {
  onComplete: (username: string) => void
  initialUsername?: string
  variant?: 'modal' | 'card'
}

export default function UsernameSetup({ onComplete, initialUsername, variant = 'modal' }: UsernameSetupProps) {
  const [username, setUsername] = useState(initialUsername || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    try {
      const result = await apiClient.completeOnboarding({ username })
      // Optionally set workspace header immediately if provided
      if (result?.defaultWorkspaceId) {
        apiClient.setCurrentWorkspace(result.defaultWorkspaceId)
      }
      toast.success('Username set successfully!')
      onComplete(username)
    } catch (error: any) {
      console.error('Failed to set username:', error)
      const message = error.response?.data?.message || 'Failed to set username'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const card = (
    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-sm border border-gray-200">
      <div className="text-center mb-6">
        <h2 className="text-xl font-mono font-medium mb-2">choose your username</h2>
        <p className="text-sm text-gray-600 font-mono">this becomes your @handle on wipshare</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1 font-mono">username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:border-gray-400 font-mono"
            placeholder="your_username"
            required
            pattern="[a-z0-9_]+"
            minLength={3}
            maxLength={20}
            autoComplete="username"
            autoFocus
          />
          <p className="text-xs text-gray-500 mt-1 font-mono">3–20 chars • lowercase, numbers, _ only</p>
        </div>

        <button
          type="submit"
          disabled={loading || username.length < 3}
          className="w-full bg-gray-900 text-white py-2 text-sm hover:bg-gray-800 disabled:bg-gray-400 font-mono transition-colors"
        >
          {loading ? 'saving…' : 'continue'}
        </button>
      </form>
    </div>
  )

  if (variant === 'card') return card

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      {card}
    </div>
  )
}