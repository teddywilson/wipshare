import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Settings, Music2, FolderOpen, Hash, Home, ChevronRight, ChevronDown, Users, Tag, X } from 'lucide-react'
import UsageDisplay from './UsageDisplay'
import { useUserTracks } from '../hooks/useTrackQueries'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: tracks = [] } = useUserTracks()
  const isActive = (path: string) => location.pathname.startsWith(path)
  const [libraryExpanded, setLibraryExpanded] = useState(true)
  
  // Get selected tag from URL params
  const searchParams = new URLSearchParams(location.search)
  const selectedTag = searchParams.get('tag')

  // React Query automatically handles data fetching

  // Extract unique tags with counts
  const tagCounts = tracks.reduce((acc, track) => {
    track.tags?.forEach((tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const handleTagClick = (tag: string | null) => {
    // Navigate to library with tag filter
    if (tag) {
      navigate(`/library?tag=${encodeURIComponent(tag)}`)
    } else {
      navigate('/library')
    }
    onClose() // Close sidebar after navigation
  }
  
  const handleNavClick = (path: string) => {
    navigate(path)
    onClose() // Close sidebar after navigation
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] md:hidden"
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onClose()
          }}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-gray-50 border-r border-gray-200 flex flex-col z-[70] md:hidden transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 flex-shrink-0">
          <Link to="/dashboard" className="text-sm font-semibold tracking-tight">
            wipshare
          </Link>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto min-h-0">
          <div className="space-y-6">
            {/* Private Section */}
            <div className="space-y-1">
              <button
                onClick={() => handleNavClick('/dashboard')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-all ${
                  location.pathname === '/dashboard' 
                    ? 'bg-gray-200 text-black' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Home</span>
              </button>

              <div>
                <div className={`flex items-center gap-2.5 px-2 py-2 rounded-md transition-all ${
                    isActive('/library') 
                      ? 'bg-gray-200 text-black' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}>
                  <button
                    onClick={() => handleNavClick('/library')}
                    className="flex items-center gap-2.5 flex-1"
                  >
                    <Music2 className="w-4 h-4" />
                    <span className="text-sm font-medium flex-1 text-left">Library</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setLibraryExpanded(!libraryExpanded)
                    }}
                    className="p-0.5 hover:bg-gray-300 rounded transition-colors"
                  >
                    {libraryExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>

                {/* Tags dropdown */}
                {libraryExpanded && (
                  <div className="ml-7 mt-1 space-y-0.5">
                    {Object.keys(tagCounts).length === 0 ? (
                      <div className="px-2 py-1 text-xs text-gray-400">No tags yet</div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleTagClick(null)}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                            !selectedTag ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          All
                          <span className="ml-1 text-gray-400">({tracks.length})</span>
                        </button>
                        {Object.entries(tagCounts).map(([tag, count]) => (
                          <button
                            key={tag}
                            onClick={() => handleTagClick(tag)}
                            className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                              selectedTag === tag ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            <Tag className="inline-block w-2.5 h-2.5 mr-1" />
                            {tag}
                            <span className="ml-1 text-gray-400">({count as number})</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNavClick('/projects')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-all group ${
                  isActive('/projects') 
                    ? 'bg-gray-200 text-black' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium flex-1 text-left">Projects</span>
                <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-500">Soon</span>
              </button>
            </div>

            {/* Shared Section */}
            <div className="space-y-1">
              <div className="px-2 py-1">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Shared</span>
              </div>
              
              <button
                onClick={() => handleNavClick('/channels')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-all group ${
                  isActive('/channels') 
                    ? 'bg-gray-200 text-black' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
              >
                <Hash className="w-4 h-4" />
                <span className="text-sm font-medium flex-1 text-left">Channels</span>
                <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-500">Soon</span>
              </button>

              <button
                onClick={() => handleNavClick('/following')}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md transition-all group ${
                  isActive('/following') 
                    ? 'bg-gray-200 text-black' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium flex-1 text-left">Following</span>
                <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-500">Soon</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="flex-shrink-0">
          {/* Usage Display */}
          <UsageDisplay />
          
          {/* Settings Link */}
          <button
            onClick={() => handleNavClick('/settings')}
            className={`w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-xs transition-colors ${
              isActive('/settings') 
                ? 'bg-gray-100 text-black' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-black'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="font-medium">Settings</span>
          </button>
        </div>
      </aside>
    </>
  )
}