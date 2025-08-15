import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, User, Music, Hash, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUserTracks } from '../hooks/useTrackQueries'
import { useSearchUsers } from '../hooks/useUserQueries'

interface SearchDropdownProps {
  isOpen: boolean
  onClose: () => void
  anchorElement: HTMLElement | null
}

interface SearchUser {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  bio?: string
  verified: boolean
  stats: {
    tracks: number
    followers: number
    following: number
  }
  isFollowing?: boolean
}

export default function SearchDropdown({ isOpen, onClose, anchorElement }: SearchDropdownProps) {
  const navigate = useNavigate()
  const { data: tracks = [] } = useUserTracks()
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // React Query for user search
  const { data: users = [], isLoading: loading } = useSearchUsers(query)

  // Extract unique tags from tracks
  const allTags = Array.from(new Set(tracks.flatMap(t => t.tags || [])))

  // Memoized filtered content
  const filteredTracks = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (q.length === 0) return []
    
    return tracks.filter(track => 
      track.title.toLowerCase().includes(q) ||
      track.description?.toLowerCase().includes(q) ||
      track.tags?.some(tag => tag.toLowerCase().includes(q))
    ).slice(0, 5)
  }, [tracks, query])

  const filteredTags = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (q.length === 0) return []
    
    return allTags.filter(tag => 
      (tag as string).toLowerCase().includes(q)
    ).slice(0, 5)
  }, [allTags, query])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && 
          anchorElement && !anchorElement.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, anchorElement])

  // React Query handles user search with built-in debouncing

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = filteredTracks.length + users.length + filteredTags.length
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItems))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => prev === 0 ? Math.max(0, totalItems - 1) : prev - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      handleSelectItem(selectedIndex)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  const handleSelectItem = (index: number) => {
    let currentIndex = 0
    
    // Check tracks
    if (index < filteredTracks.length) {
      navigate(`/track/${filteredTracks[index].id}`)
      onClose()
      return
    }
    currentIndex += filteredTracks.length
    
    // Check users
    if (index < currentIndex + users.length) {
      navigate(`/users/${users[index - currentIndex].id}`)
      onClose()
      return
    }
    currentIndex += users.length
    
    // Check tags
    if (index < currentIndex + filteredTags.length) {
      // Navigate to a filtered view or search results page
      navigate(`/dashboard?tag=${encodeURIComponent(filteredTags[index - currentIndex] as string)}`)
      onClose()
      return
    }
  }

  if (!isOpen || !anchorElement) return null

  // Calculate position based on anchor element
  const rect = anchorElement.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const minWidth = 400
  const preferredWidth = Math.max(rect.width, minWidth)
  
  // Check if dropdown would overflow viewport and adjust position
  let leftPosition = rect.left
  if (leftPosition + preferredWidth > viewportWidth - 16) {
    // Position from the right edge if it would overflow
    leftPosition = viewportWidth - preferredWidth - 16
  }
  
  const dropdownStyle = {
    position: 'fixed' as const,
    top: `${rect.bottom + 8}px`,
    left: `${Math.max(16, leftPosition)}px`, // Ensure at least 16px from left edge
    width: `${preferredWidth}px`,
    zIndex: 50
  }

  const hasResults = filteredTracks.length > 0 || users.length > 0 || filteredTags.length > 0

  return (
    <div 
      ref={dropdownRef}
      className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fade-in-scale"
      style={dropdownStyle}
    >
      {/* Search Input */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tracks, users, or tags..."
            className="w-full pl-9 pr-9 py-2 text-sm font-mono focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[400px] overflow-y-auto">
        {!query ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 font-mono">Start typing to search</p>
            <p className="text-xs text-gray-400 mt-2">Press ⌘K anytime to search</p>
          </div>
        ) : !hasResults && !loading ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-500 font-mono">No results found</p>
          </div>
        ) : (
          <div>
            {/* Tracks Section */}
            {filteredTracks.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-mono text-gray-500 bg-gray-50">
                  Tracks
                </div>
                {filteredTracks.map((track, idx) => {
                  const isSelected = selectedIndex === idx
                  return (
                    <button
                      key={track.id}
                      onClick={() => handleSelectItem(idx)}
                      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                        isSelected ? 'bg-gray-50' : ''
                      }`}
                    >
                      <Music className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono truncate">{track.title}</p>
                        {track.tags && track.tags.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            {track.tags.map((tag: string) => `#${tag}`).join(' ')}
                          </p>
                        )}
                      </div>
                      {isSelected && <ArrowRight className="w-3 h-3 text-gray-400" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Users Section */}
            {users.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-mono text-gray-500 bg-gray-50">
                  Users
                </div>
                {users.map((user, idx) => {
                  const globalIdx = filteredTracks.length + idx
                  const isSelected = selectedIndex === globalIdx
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectItem(globalIdx)}
                      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                        isSelected ? 'bg-gray-50' : ''
                      }`}
                    >
                      {user.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-gray-500">@{user.username}</p>
                      </div>
                      {isSelected && <ArrowRight className="w-3 h-3 text-gray-400" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Tags Section */}
            {filteredTags.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-mono text-gray-500 bg-gray-50">
                  Tags
                </div>
                {filteredTags.map((tag, idx) => {
                  const globalIdx = filteredTracks.length + users.length + idx
                  const isSelected = selectedIndex === globalIdx
                  return (
                    <button
                      key={tag as string}
                      onClick={() => handleSelectItem(globalIdx)}
                      className={`w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left ${
                        isSelected ? 'bg-gray-50' : ''
                      }`}
                    >
                      <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-mono">{tag as string}</p>
                      </div>
                      {isSelected && <ArrowRight className="w-3 h-3 text-gray-400" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Loading indicator */}
            {loading && users.length === 0 && (
              <div className="px-3 py-2">
                <p className="text-xs text-gray-500">Searching users...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {hasResults && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 font-mono">
            ↑↓ to navigate • Enter to select • Esc to close
          </p>
        </div>
      )}
    </div>
  )
}