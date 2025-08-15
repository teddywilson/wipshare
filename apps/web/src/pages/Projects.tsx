import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Folder, Plus, Music, ChevronRight, Grid, List } from 'lucide-react'
import { useUserProjects, useCreateProject } from '../hooks/useProjectQueries'
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
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'collection'
  })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // React Query hooks
  const { data: projectsData, isLoading: loading, error } = useUserProjects(1, 100)
  const createProjectMutation = useCreateProject()

  const projects = projectsData?.projects || []

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      await createProjectMutation.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        isPublic: false
      })
      
      // Close form and reset
      setShowCreateForm(false)
      setFormData({ title: '', description: '', type: 'collection' })
      
      // Emit sidebar refresh event
      sidebarEvents.emit(SIDEBAR_EVENTS.REFRESH_PROJECTS)
      
      toast.success(`${formData.type === 'playlist' ? 'Playlist' : 'Project'} created!`)
    } catch (error: any) {
      console.error('Failed to create project:', error)
      toast.error('Failed to create project')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getProjectIcon = (type: string) => {
    return type === 'playlist' ? Music : Folder
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <h1 className="text-sm font-mono text-gray-700">projects</h1>
              <span className="text-xs text-gray-500 font-mono">
                {projects.length} item{projects.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-mono hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="animate-pulse">
                    <div className="h-32 bg-gray-200 rounded mb-4" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && projects.length === 0 && (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Folder className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-sm font-mono text-gray-700 mb-2">No projects yet</h3>
              <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">
                Create projects to organize your tracks into albums, EPs, or collections. 
                Use playlists to curate tracks across different projects.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm font-mono hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create your first project
              </button>
            </div>
          )}

          {/* Projects Grid/List */}
          {!loading && projects.length > 0 && (
            <div className="animate-fade-in">
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project: Project) => {
                    const IconComponent = getProjectIcon(project.type)
                    return (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="group bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all hover:shadow-sm"
                      >
                        <div className="p-4">
                          {/* Image/Icon */}
                          <div className="aspect-square bg-gray-50 rounded-lg mb-4 overflow-hidden relative">
                            {project.imageUrl ? (
                              <img 
                                src={project.imageUrl} 
                                alt={project.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <IconComponent className="w-8 h-8 text-gray-400" />
                              </div>
                            )}
                            {/* Overlay with track count */}
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                              {project.trackCount || 0}
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div>
                            <h3 className="font-mono text-sm font-medium mb-1 group-hover:text-black transition-colors">
                              {project.title}
                            </h3>
                            {project.description && (
                              <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                {project.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span className="capitalize font-mono">{project.type}</span>
                              <span className="font-mono">{formatDate(project.updatedAt)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                /* List View */
                <div className="space-y-2">
                  {projects.map((project: Project) => {
                    const IconComponent = getProjectIcon(project.type)
                    return (
                      <Link
                        key={project.id}
                        to={`/projects/${project.id}`}
                        className="group flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all hover:shadow-sm"
                      >
                        {/* Icon */}
                        <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          {project.imageUrl ? (
                            <img 
                              src={project.imageUrl} 
                              alt={project.title}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <IconComponent className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <h3 className="font-mono text-sm font-medium group-hover:text-black transition-colors">
                                {project.title}
                              </h3>
                              {project.description && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {project.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-6 text-xs text-gray-400 font-mono">
                              <span>{project.trackCount || 0} tracks</span>
                              <span className="capitalize">{project.type}</span>
                              <span>{formatDate(project.updatedAt)}</span>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <form onSubmit={handleCreateSubmit}>
              <div className="p-6">
                <h2 className="text-lg font-mono font-medium mb-6">Create New</h2>
                
                {/* Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-700 mb-2 font-mono">
                    Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'collection' })}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        formData.type === 'collection'
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Folder className="w-4 h-4 mb-1" />
                      <div className="text-sm font-mono font-medium">Project</div>
                      <div className="text-xs text-gray-500">Album, EP, or collection</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'playlist' })}
                      className={`p-3 border rounded-lg text-left transition-colors ${
                        formData.type === 'playlist'
                          ? 'border-black bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Music className="w-4 h-4 mb-1" />
                      <div className="text-sm font-mono font-medium">Playlist</div>
                      <div className="text-xs text-gray-500">Curated track collection</div>
                    </button>
                  </div>
                </div>
                
                {/* Title */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm"
                    placeholder="Enter title..."
                    required
                  />
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black font-mono text-sm resize-none"
                    placeholder="Add a description..."
                  />
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3 p-6 pt-0">
                <button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                  className="px-6 py-2.5 bg-black text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({ title: '', description: '', type: 'collection' })
                  }}
                  className="px-6 py-2.5 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}