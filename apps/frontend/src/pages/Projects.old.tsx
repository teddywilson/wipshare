import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Folder, Plus, Music, ChevronRight, Grid, List } from 'lucide-react'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'
import { sidebarEvents, SIDEBAR_EVENTS } from '../lib/events'

interface Project {
  id: string
  title: string
  description?: string
  imageUrl?: string
  type: string
  trackCount: number
  previewTracks: any[]
  createdAt: string
  updatedAt: string
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false) // Start with no loading
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'collection'
  })
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    // Load cached data first if available
    const cached = sessionStorage.getItem('projects_list')
    if (cached) {
      try {
        const data = JSON.parse(cached)
        setProjects(data.projects || [])
        // If cache is fresh, don't fetch at all
        if (Date.now() - data.timestamp < 60000) { // 1 minute cache
          return
        }
      } catch (e) {
        sessionStorage.removeItem('projects_list')
      }
    } else {
      // Only show loading if we have no cached data
      setLoading(true)
    }
    
    // Fetch fresh data
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    // Only show loading spinner if we have no data to show
    const shouldShowLoading = projects.length === 0
    if (shouldShowLoading) {
      setLoading(true)
    }
    
    try {
      const response = await apiClient.getUserProjects()
      const projectsData = response.projects || []
      console.log('Fetched projects:', projectsData)
      setProjects(projectsData)
      // Cache the projects list
      sessionStorage.setItem('projects_list', JSON.stringify({
        projects: projectsData,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      // Only show error if we have no cached data
      if (projects.length === 0) {
        toast.error('Failed to load projects')
      }
    } finally {
      // Always clear loading state
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error('Project title is required')
      return
    }

    setCreating(true)
    try {
      await apiClient.createProject({
        title: formData.title,
        description: formData.description,
        type: formData.type
      })
      
      toast.success('Project created successfully')
      setShowCreateForm(false)
      setFormData({ title: '', description: '', type: 'collection' })
      fetchProjects() // Refresh the list
      // Trigger sidebar refresh
      sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_PROJECTS)
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create project'
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
        return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes}m ago`
      }
      return `${diffInHours}h ago`
    } else if (diffInDays === 1) {
      return 'yesterday'
    } else if (diffInDays < 30) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'album': return 'text-purple-600 bg-purple-50'
      case 'ep': return 'text-blue-600 bg-blue-50'
      case 'single': return 'text-green-600 bg-green-50'
      case 'playlist': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="animate-fade-in">
          {/* Header */}
          <div className="border-b border-gray-200">
            <div className="px-6 lg:px-8 py-8">
              <div className="max-w-6xl mx-auto">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-2xl font-mono mb-3">Projects</h1>
                    <p className="text-gray-600 font-mono text-sm max-w-2xl">
                      Organize your tracks into albums, EPs, and collaborative collections. 
                      Create projects to share with collaborators or prepare for release.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-black text-white px-4 py-2 text-sm font-mono hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Project
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 lg:px-8 py-6">
            <div className="max-w-6xl mx-auto">
              {loading ? (
                /* Simple Loading State */
                <div className="flex items-center gap-3 py-12">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                  <span className="font-mono text-sm text-gray-600">loading projects...</span>
                </div>
              ) : projects.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-24 px-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Folder className="w-10 h-10 text-gray-400" />
                  </div>
                  <h2 className="font-mono text-xl mb-3">No projects yet</h2>
                  <p className="text-gray-600 font-mono text-sm mb-8 max-w-md text-center">
                    Create your first project to start organizing your tracks into albums, EPs, or collections.
                  </p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-black text-white px-6 py-3 text-sm font-mono hover:bg-gray-800 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Project
                  </button>
                </div>
              ) : (
                <>
                  {/* View Toggle */}
                  <div className="flex justify-end mb-6">
                    <div className="flex gap-1 border border-gray-200 rounded">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                        title="Grid view"
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                        title="List view"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {viewMode === 'grid' ? (
                    /* Grid View */
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          to={`/projects/${project.id}`}
                          className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 animate-fade-in"
                        >
                          {/* Project Cover */}
                          <div className="aspect-[3/2] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                            {project.imageUrl ? (
                              <img 
                                src={project.imageUrl} 
                                alt={project.title} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Folder className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                            <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-mono rounded ${getTypeColor(project.type)}`}>
                              {project.type}
                            </div>
                          </div>

                          {/* Project Info */}
                          <div className="p-4">
                            <h3 className="font-mono font-medium text-base mb-2 group-hover:text-blue-600 transition-colors">
                              {project.title}
                            </h3>
                            
                            {project.description && (
                              <p className="text-sm text-gray-600 font-mono mb-3 line-clamp-2">
                                {project.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-xs text-gray-500 font-mono">
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1">
                                  <Music className="w-3 h-3" />
                                  {project.trackCount} {project.trackCount === 1 ? 'track' : 'tracks'}
                                </span>
                              </div>
                              <span className="flex items-center gap-1">
                                {formatTimeAgo(project.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}

                      {/* Create New Project Card */}
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="group bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-hidden hover:border-gray-400 transition-all duration-200 flex flex-col items-center justify-center aspect-[3/2] md:aspect-auto md:h-full animate-fade-in"
                      >
                        <Plus className="w-10 h-10 text-gray-400 mb-3 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-mono text-gray-600 group-hover:text-gray-900">New Project</span>
                      </button>
                    </div>
                  ) : (
                    /* List View */
                    <div className="space-y-3">
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          to={`/projects/${project.id}`}
                          className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200 animate-fade-in"
                        >
                          {/* Thumbnail */}
                          <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                            {project.imageUrl ? (
                              <img 
                                src={project.imageUrl} 
                                alt={project.title} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Folder className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-mono font-medium text-sm group-hover:text-blue-600 transition-colors truncate">
                                {project.title}
                              </h3>
                              <span className={`px-2 py-0.5 text-xs font-mono rounded ${getTypeColor(project.type)}`}>
                                {project.type}
                              </span>
                            </div>
                            {project.description && (
                              <p className="text-xs text-gray-600 font-mono truncate mb-2">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                              <span className="flex items-center gap-1">
                                <Music className="w-3 h-3" />
                                {project.trackCount}
                              </span>
                              <span>{formatTimeAgo(project.updatedAt)}</span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="font-mono text-lg mb-4">Create New Project</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-mono text-gray-600 mb-1">
                    Project Name
                  </label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-400"
                    placeholder="My New Project"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-600 mb-1">
                    Description (optional)
                  </label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-400 resize-none"
                    rows={3}
                    placeholder="Brief description of your project..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-600 mb-1">
                    Type
                  </label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-400"
                  >
                    <option value="collection">Collection</option>
                    <option value="album">Album</option>
                    <option value="ep">EP</option>
                    <option value="single">Single</option>
                    <option value="playlist">Playlist</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({ title: '', description: '', type: 'collection' })
                  }}
                  disabled={creating}
                  className="flex-1 border border-gray-300 rounded px-4 py-2 text-sm font-mono hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !formData.title.trim()}
                  className="flex-1 bg-black text-white rounded px-4 py-2 text-sm font-mono hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}