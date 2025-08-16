import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Settings, Music2, FolderOpen, ListMusic, Home, ChevronRight, ChevronDown, Tag, Building2, Users, Lock, Globe, Link as LinkIcon, Eye, Loader2, LogOut, Crown } from 'lucide-react'
import UsageDisplay from './UsageDisplay'
import { useUserTracks } from '../hooks/useTrackQueries'
import { apiClient } from '../lib/api-client'
import { useAuth } from '../lib/stytch-auth-context'
import { sidebarEvents, SIDEBAR_EVENTS } from '../lib/events'
import CreatePlaylistModal from './CreatePlaylistModal'
import { CacheManager } from '../lib/cache'
import { playlistEvents, PLAYLIST_EVENTS } from '../lib/playlist-events'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: tracks = [], isLoading: tracksLoading } = useUserTracks()
  const { logout } = useAuth()
  const isActive = (path: string) => location.pathname.startsWith(path)
  const [libraryExpanded, setLibraryExpanded] = useState(true) // Always expanded by default
  const [projectsExpanded, setProjectsExpanded] = useState(() => {
    // Auto-expand if there are cached projects
    const cached = localStorage.getItem('cachedProjects')
    const cachedProjects = cached ? JSON.parse(cached) : []
    return cachedProjects.length > 0
  })
  const [playlistsExpanded, setPlaylistsExpanded] = useState(true) // Default expanded
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [myPlaylists, setMyPlaylists] = useState<any[]>(() => {
    // Load cached playlists using CacheManager
    return CacheManager.get<any[]>('cachedMyPlaylists') || []
  })
  const [sharedPlaylists, setSharedPlaylists] = useState<any[]>(() => {
    // Load cached shared playlists using CacheManager
    return CacheManager.get<any[]>('cachedSharedPlaylists') || []
  })
  const [projects, setProjects] = useState<any[]>(() => {
    // Load cached projects from multiple sources
    const fromCache = CacheManager.get<any[]>('cachedProjects')
    const fromSession = sessionStorage.getItem('projects_list')
    if (fromSession) {
      return JSON.parse(fromSession)
    }
    return fromCache || []
  })
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [cachedTagCounts, setCachedTagCounts] = useState<Record<string, number>>(() => {
    // Load cached tags from localStorage on mount
    const cached = localStorage.getItem('tagCounts')
    return cached ? JSON.parse(cached) : {}
  })
  const [navigatingToProject, setNavigatingToProject] = useState<string | null>(null)
  const [navigatingToPlaylist, setNavigatingToPlaylist] = useState<string | null>(null)
  const [navigatingToProjects, setNavigatingToProjects] = useState(false)
  const projectsFetchedRef = useRef(false)
  const playlistsFetchedRef = useRef(false)
  
  // Get selected tag from URL params
  const searchParams = new URLSearchParams(location.search)
  const selectedTag = searchParams.get('tag')

  // Fetch all data on mount for instant display
  useEffect(() => {
    // Fetch projects immediately if not already fetched
    if (!projectsFetchedRef.current) {
      fetchProjects()
      projectsFetchedRef.current = true
    }
    // Fetch playlists immediately if not already fetched
    if (!playlistsFetchedRef.current) {
      fetchPlaylists()
      playlistsFetchedRef.current = true
    }
  }, [])

  // Listen for refresh events
  useEffect(() => {
    const unsubProjects = sidebarEvents.on(SIDEBAR_EVENTS.REFRESH_PROJECTS, () => {
      fetchProjects()
    })
    
    // Note: Tags are now automatically refreshed via React Query
    const unsubTags = sidebarEvents.on(SIDEBAR_EVENTS.REFRESH_TAGS, () => {
      // React Query handles this automatically
    })
    
    const unsubAll = sidebarEvents.on(SIDEBAR_EVENTS.REFRESH_ALL, () => {
      fetchProjects()
      fetchPlaylists()
    })

    // Listen for playlist events
    const handlePlaylistRefresh = () => {
      fetchPlaylists()
    }
    const unsubPlaylistCreated = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_CREATED, handlePlaylistRefresh)
    const unsubPlaylistUpdated = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_UPDATED, handlePlaylistRefresh)
    const unsubPlaylistDeleted = playlistEvents.on(PLAYLIST_EVENTS.PLAYLIST_DELETED, handlePlaylistRefresh)
    const unsubPlaylistRefresh = playlistEvents.on(PLAYLIST_EVENTS.REFRESH_PLAYLISTS, handlePlaylistRefresh)
    
    return () => {
      unsubProjects()
      unsubTags()
      unsubAll()
      unsubPlaylistCreated()
      unsubPlaylistUpdated()
      unsubPlaylistDeleted()
      unsubPlaylistRefresh()
    }
  }, [])

  const fetchProjects = async () => {
    // Don't show loading if we have cached data
    if (projects.length === 0) {
      setProjectsLoading(true)
    }
    try {
      const response = await apiClient.getUserProjects()
      const newProjects = response.projects || []
      setProjects(newProjects)
      // Cache projects in multiple places
      CacheManager.set('cachedProjects', newProjects)
      sessionStorage.setItem('projects_list', JSON.stringify({
        projects: newProjects,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setProjectsLoading(false)
    }
  }

  const fetchPlaylists = async () => {
    try {
      // Fetch my playlists
      const myResponse = await apiClient.get('/playlists/my')
      const newMyPlaylists = myResponse.playlists?.slice(0, 4) || []
      setMyPlaylists(newMyPlaylists)
      // Cache my playlists using CacheManager
      CacheManager.set('cachedMyPlaylists', newMyPlaylists)
      
      // Fetch shared playlists
      const sharedResponse = await apiClient.get('/playlists/discover')
      const newSharedPlaylists = sharedResponse.playlists?.slice(0, 4) || []
      setSharedPlaylists(newSharedPlaylists)
      // Cache shared playlists using CacheManager
      CacheManager.set('cachedSharedPlaylists', newSharedPlaylists)
    } catch (error) {
      console.error('Failed to fetch playlists:', error)
    }
  }

  // Extract unique tags with counts
  const tagCounts = tracks.reduce((acc, track) => {
    track.tags?.forEach((tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)
  
  // Update cache when tags change
  useEffect(() => {
    if (Object.keys(tagCounts).length > 0) {
      setCachedTagCounts(tagCounts)
      localStorage.setItem('tagCounts', JSON.stringify(tagCounts))
    }
  }, [JSON.stringify(tagCounts)])
  
  // Always prefer fresh tags, but show cached if nothing else available
  const displayTagCounts = Object.keys(tagCounts).length > 0 ? tagCounts : cachedTagCounts

  const handleTagClick = (tag: string | null) => {
    // Navigate to library with tag filter
    if (tag) {
      navigate(`/library?tag=${encodeURIComponent(tag)}`)
    } else {
      navigate('/library')
    }
  }

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'PRIVATE':
      case 'SECRET_LINK': // SECRET_LINK is still fundamentally private
        return <Lock className="w-2.5 h-2.5" />
      case 'FOLLOWERS_ONLY':
        return <Users className="w-2.5 h-2.5" />
      case 'PUBLIC':
        return <Globe className="w-2.5 h-2.5" />
      case 'WORKSPACE':
        return <Building2 className="w-2.5 h-2.5" />
      default:
        return <Eye className="w-2.5 h-2.5" />
    }
  }

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <Link to="/dashboard" className="text-sm font-medium text-gray-900 hover:text-gray-700 transition-colors">
          wipshare
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto min-h-0">
        <div className="space-y-1">
          <Link
            to="/dashboard"
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all ${
              location.pathname === '/dashboard' 
                ? 'bg-gray-200 text-black' 
                : 'text-gray-600 hover:bg-gray-100 hover:text-black'
            }`}
            // Prefetch handled by React Query
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Home</span>
          </Link>

          <div>
            <Link
              to="/library"
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all ${
                  isActive('/library') 
                    ? 'bg-gray-200 text-black' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                }`}
                onClick={() => setLibraryExpanded(true)} // Expand when navigating
                // Prefetch handled by React Query
              >
                <Music2 className="w-4 h-4" />
                <span className="text-sm font-medium flex-1">Library</span>
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
              </Link>

              {/* Tags dropdown */}
              {libraryExpanded && (
                <div className="ml-5 mt-1 space-y-0.5">
                  {Object.keys(displayTagCounts).length === 0 ? (
                    <div className="px-2 py-1 text-xs text-gray-400">
                      {tracksLoading ? 'Loading tags...' : 'No tags yet'}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleTagClick(null)}
                        className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                          !selectedTag ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        All
                        <span className="ml-1 text-gray-400">({tracks.length || '...'})</span>
                      </button>
                      {Object.entries(displayTagCounts).map(([tag, count]) => (
                        <button
                          key={tag}
                          onClick={() => handleTagClick(tag)}
                          className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
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

          <div>
            <Link
              to="/projects"
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all group ${
                  isActive('/projects') 
                    ? 'bg-gray-200 text-black' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                } ${
                  navigatingToProjects ? 'opacity-50' : ''
                }`}
                onClick={() => {
                  setProjectsExpanded(true) // Expand when navigating
                  if (!isActive('/projects')) {
                    setNavigatingToProjects(true)
                    setTimeout(() => setNavigatingToProjects(false), 150)
                  }
                }}
              >
                {navigatingToProjects ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FolderOpen className="w-4 h-4" />
                )}
                <span className="text-sm font-medium flex-1">Projects</span>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setProjectsExpanded(!projectsExpanded)
                  }}
                  className="p-0.5 hover:bg-gray-300 rounded transition-colors"
                >
                  {projectsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </Link>

              {/* Projects dropdown */}
              {projectsExpanded && (
                <div className="ml-5 mt-1 space-y-0.5">
                  {projects.length === 0 ? (
                    <div className="px-2 py-1 text-xs text-gray-400">
                      {projectsLoading ? 'Loading projects...' : 'No projects yet'}
                    </div>
                  ) : (
                    <>
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          to={`/projects/${project.id}`}
                          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 transition-colors ${
                            location.pathname === `/projects/${project.id}` 
                              ? 'bg-gray-100 text-black' 
                              : 'text-gray-600'
                          } ${
                            navigatingToProject === project.id ? 'opacity-50' : ''
                          }`}
                          onClick={() => {
                            if (location.pathname !== `/projects/${project.id}`) {
                              setNavigatingToProject(project.id)
                              // Clear after navigation starts
                              setTimeout(() => setNavigatingToProject(null), 150)
                            }
                          }}
                        >
                          {project.imageUrl ? (
                            <img 
                              src={project.imageUrl} 
                              alt="" 
                              className="w-4 h-4 object-cover flex-shrink-0 rounded-sm" 
                            />
                          ) : (
                            <FolderOpen className="w-4 h-4 flex-shrink-0 text-gray-400" />
                          )}
                          <span className="text-xs truncate flex-1 flex items-center gap-1.5">
                            {navigatingToProject === project.id && (
                              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                            )}
                            <span className="truncate">
                              {project.title}
                              <span className="ml-1 text-gray-400">({project.trackCount || 0})</span>
                            </span>
                          </span>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

          <div>
            <Link
              to="/playlists"
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all ${
                isActive('/playlists')
                  ? 'bg-gray-200 text-black' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-black'
              }`}
              onClick={() => setPlaylistsExpanded(true)} // Expand when navigating
            >
              <ListMusic className="w-4 h-4" />
              <span className="text-sm font-medium flex-1">Playlists</span>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setPlaylistsExpanded(!playlistsExpanded)
                }}
                className="p-0.5 hover:bg-gray-300 rounded transition-colors"
              >
                {playlistsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </Link>

              {/* Playlists dropdown */}
              {playlistsExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {/* My Playlists */}
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-widest">My Playlists</span>
                    <button
                      onClick={() => setShowCreatePlaylist(true)}
                      className="text-[9px] text-gray-400 hover:text-black transition-colors uppercase"
                    >
                      + New
                    </button>
                  </div>
                  
                  {myPlaylists.length > 0 ? (
                    <>
                      {myPlaylists.slice(0, 3).map((playlist) => (
                        <Link
                          key={playlist.id}
                          to={`/playlist/${playlist.id}`}
                          className={`flex items-center gap-2 px-2 py-0.5 hover:bg-gray-100 transition-colors ${
                            location.pathname === `/playlist/${playlist.id}` ? 'bg-gray-100 text-black' : 'text-gray-600'
                          } ${
                            navigatingToPlaylist === playlist.id ? 'opacity-50' : ''
                          }`}
                          onClick={() => {
                            if (location.pathname !== `/playlist/${playlist.id}`) {
                              setNavigatingToPlaylist(playlist.id)
                              setTimeout(() => setNavigatingToPlaylist(null), 150)
                            }
                          }}
                        >
                          {playlist.coverUrl ? (
                            <img 
                              src={playlist.coverUrl} 
                              alt="" 
                              className="w-4 h-4 object-cover flex-shrink-0 rounded-sm" 
                            />
                          ) : (
                            <ListMusic className="w-4 h-4 flex-shrink-0 text-gray-400" />
                          )}
                          <span className="text-xs truncate flex-1 flex items-center gap-1.5">
                            {navigatingToPlaylist === playlist.id && (
                              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                            )}
                            <span className="truncate">
                              {playlist.title}
                              <span className="ml-1 text-gray-400">({playlist.tracksCount || 0})</span>
                            </span>
                          </span>
                          <span className="flex-shrink-0 text-gray-400">
                            {getVisibilityIcon(playlist.visibility)}
                          </span>
                        </Link>
                      ))}
                      {myPlaylists.length >= 3 && (
                        <Link
                          to="/playlists"
                          className="block px-2 py-0.5 text-xs text-gray-500 hover:text-black transition-colors"
                        >
                          View All →
                        </Link>
                      )}
                    </>
                  ) : (
                    <div className="px-2 py-0.5 text-[11px] text-gray-400 italic">Create your first playlist</div>
                  )}
                  
                  {/* Shared with Me */}
                  <div className="px-2 py-1 pt-3">
                    <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-widest">Shared with Me</span>
                  </div>
                  
                  {sharedPlaylists.length > 0 ? (
                    <>
                      {sharedPlaylists.slice(0, 3).map((playlist) => (
                        <Link
                          key={playlist.id}
                          to={`/playlist/${playlist.id}`}
                          className={`flex items-center gap-2 px-2 py-0.5 hover:bg-gray-100 transition-colors ${
                            location.pathname === `/playlist/${playlist.id}` ? 'bg-gray-100 text-black' : 'text-gray-600'
                          } ${
                            navigatingToPlaylist === playlist.id ? 'opacity-50' : ''
                          }`}
                          onClick={() => {
                            if (location.pathname !== `/playlist/${playlist.id}`) {
                              setNavigatingToPlaylist(playlist.id)
                              setTimeout(() => setNavigatingToPlaylist(null), 150)
                            }
                          }}
                        >
                          {playlist.coverUrl ? (
                            <img 
                              src={playlist.coverUrl} 
                              alt="" 
                              className="w-4 h-4 object-cover flex-shrink-0 rounded-sm" 
                            />
                          ) : (
                            <ListMusic className="w-4 h-4 flex-shrink-0 text-gray-400" />
                          )}
                          <span className="text-xs truncate flex-1 flex items-center gap-1.5">
                            {navigatingToPlaylist === playlist.id && (
                              <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                            )}
                            <span className="truncate">
                              {playlist.user?.displayName || playlist.user?.username} – {playlist.title}
                              <span className="ml-1 text-gray-400">({playlist.tracksCount || 0})</span>
                            </span>
                          </span>
                          <span className="flex-shrink-0 text-gray-400">
                            {getVisibilityIcon(playlist.visibility)}
                          </span>
                        </Link>
                      ))}
                      {sharedPlaylists.length >= 3 && (
                        <Link
                          to="/playlists/discover"
                          className="block px-2 py-0.5 text-xs text-gray-500 hover:text-black transition-colors"
                        >
                          View All →
                        </Link>
                      )}
                    </>
                  ) : (
                    <div className="px-2 py-0.5 text-[11px] text-gray-400 italic">Follow people to see their playlists</div>
                  )}
                </div>
              )}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="flex-shrink-0">
        {/* Usage Display */}
        <UsageDisplay />
        
        {/* Account Section */}
        <div className="border-t border-gray-200 pt-4 pb-4">
          <div className="px-4 pb-2">
            <span className="text-[9px] font-semibold text-gray-300 uppercase tracking-widest">Account</span>
          </div>
          
          <div className="space-y-0.5 px-3">
            <Link
              to="/settings"
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive('/settings') 
                  ? 'bg-gray-200 text-black' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-black'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
            
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-black transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <CreatePlaylistModal
          onClose={() => setShowCreatePlaylist(false)}
          onSuccess={(playlist) => {
            setShowCreatePlaylist(false)
            // Emit event to refresh playlists everywhere
            playlistEvents.emit(PLAYLIST_EVENTS.PLAYLIST_CREATED)
            navigate(`/playlist/${playlist.id}`)
          }}
        />
      )}
    </aside>
  )
}