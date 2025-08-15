import { useState } from 'react'
import { X } from 'lucide-react'
import { useWorkspace } from '../contexts/WorkspaceContext'

interface CreateWorkspaceModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData({
      name,
      // Auto-generate slug from name
      slug: name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 30)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.slug.trim()) {
      return
    }

    setLoading(true)
    try {
      await createWorkspace({
        name: formData.name.trim(),
        slug: formData.slug.trim()
      })
      
      // Reset form
      setFormData({ name: '', slug: '' })
      onClose()
      // No reload needed - workspace context handles the switch!
    } catch (error: any) {
      console.error('Failed to create workspace:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Create Workspace</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="My Team"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace URL
            </label>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-1">wipshare.com/w/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                }))}
                placeholder="my-team"
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim() || !formData.slug.trim()}
              className="flex-1 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}