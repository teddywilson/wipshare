import { useState } from 'react'
import { X, Mail } from 'lucide-react'
import { useInviteProjectMember } from '../hooks/useProjectMemberQueries'
import toast from 'react-hot-toast'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectTitle: string
}

const ROLES = [
  { value: 'VIEWER', label: 'Viewer', description: 'Can view project and tracks' },
  { value: 'EDITOR', label: 'Editor', description: 'Can edit project and manage tracks' }
]

export default function InviteMemberModal({ isOpen, onClose, projectId, projectTitle }: InviteMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('EDITOR')
  const inviteProjectMemberMutation = useInviteProjectMember()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      await inviteProjectMemberMutation.mutateAsync({
        projectId,
        email: email.trim(),
        role
      })
      
      setEmail('')
      setRole('EDITOR')
      onClose()
    } catch (error: any) {
      console.error('Failed to invite member:', error)
      const message = error.response?.data?.error || 'Failed to send invitation'
      toast.error(message)
    }
  }

  const handleCancel = () => {
    setEmail('')
    setRole('editor')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-mono">Invite Member</h2>
            <p className="text-sm text-gray-600 font-mono">{projectTitle}</p>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            disabled={inviteProjectMemberMutation.isPending}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-mono text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@wipshare.com"
                disabled={inviteProjectMemberMutation.isPending}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-mono text-gray-700 mb-2">
              Role
            </label>
            <div className="space-y-2">
              {ROLES.map((roleOption) => (
                <label key={roleOption.value} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={roleOption.value}
                    checked={role === roleOption.value}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={inviteProjectMemberMutation.isPending}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-mono text-gray-900">{roleOption.label}</div>
                    <div className="text-xs font-mono text-gray-500">{roleOption.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={inviteProjectMemberMutation.isPending}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-mono text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteProjectMemberMutation.isPending || !email.trim()}
              className="flex-1 px-4 py-2 bg-black text-white font-mono text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {inviteProjectMemberMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}