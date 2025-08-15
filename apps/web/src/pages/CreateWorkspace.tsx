import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Sparkles } from 'lucide-react'
import { useWorkspace } from '../contexts/WorkspaceContext'
import toast from 'react-hot-toast'

export default function CreateWorkspace() {
  const navigate = useNavigate()
  const { createWorkspace } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData(prev => ({
      ...prev,
      name,
      // Auto-generate slug from name
      slug: name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 30)
    }))
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value.toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30)
    setFormData(prev => ({ ...prev, slug }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Workspace name is required')
      return
    }
    
    if (!formData.slug.trim()) {
      toast.error('Workspace slug is required')
      return
    }
    
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(formData.slug)) {
      toast.error('Slug must start and end with a letter or number, and contain only lowercase letters, numbers, and hyphens')
      return
    }

    setLoading(true)
    try {
      const workspace = await createWorkspace({
        name: formData.name.trim(),
        slug: formData.slug.trim()
      })
      
      toast.success('Workspace created successfully!')
      navigate(`/workspace/${workspace.slug}/settings`)
    } catch (error: any) {
      console.error('Failed to create workspace:', error)
      // Error is already handled by the context
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              back
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-mono">Create New Workspace</h1>
                <p className="text-sm text-gray-500 font-mono">
                  Collaborate with your team on tracks and projects
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-mono text-gray-600 mb-2">
                Workspace Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="My Team Workspace"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1 font-mono">
                This is how your workspace will appear throughout the app
              </p>
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-600 mb-2">
                Workspace URL *
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-gray-500">wipshare.com/w/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  placeholder="my-team"
                  disabled={loading}
                  className="flex-1 px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                Lowercase letters, numbers, and hyphens only (3-30 characters)
              </p>
            </div>

            <div>
              <label className="block text-sm font-mono text-gray-600 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What's this workspace for?"
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50 resize-none"
              />
            </div>

            {/* Plan Selection */}
            <div>
              <label className="block text-sm font-mono text-gray-600 mb-3">
                Choose Your Plan
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Free Plan */}
                <div className="border-2 border-gray-300 rounded-lg p-4 relative">
                  <div className="absolute top-4 right-4">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-400 bg-white flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    </div>
                  </div>
                  <h3 className="font-mono font-medium mb-2">Free</h3>
                  <p className="text-2xl font-mono mb-3">$0<span className="text-sm text-gray-500">/month</span></p>
                  <ul className="space-y-1 text-xs font-mono text-gray-600">
                    <li>• Up to 1 member</li>
                    <li>• 50 tracks</li>
                    <li>• 5 projects</li>
                    <li>• 5GB storage</li>
                    <li>• Community support</li>
                  </ul>
                </div>

                {/* Pro Plan */}
                <div className="border-2 border-purple-500 rounded-lg p-4 relative bg-purple-50">
                  <div className="absolute top-4 right-4">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                  </div>
                  <h3 className="font-mono font-medium mb-2">Pro</h3>
                  <p className="text-2xl font-mono mb-3">$19.99<span className="text-sm text-gray-500">/month</span></p>
                  <ul className="space-y-1 text-xs font-mono text-gray-600">
                    <li>• Up to 5 members</li>
                    <li>• 500 tracks</li>
                    <li>• 50 projects</li>
                    <li>• 50GB storage</li>
                    <li>• Priority support</li>
                  </ul>
                  <div className="mt-3 text-xs font-mono text-purple-600">
                    Coming soon
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 font-mono">
                You can upgrade to Pro anytime from workspace settings
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !formData.name.trim() || !formData.slug.trim()}
                className="flex-1 px-4 py-2 bg-black text-white font-mono text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}