import { useState, useEffect, useRef } from 'react'
import { Search, X, User, UserPlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
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

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'tracks'>('all')
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Search for users when query changes
  useEffect(() => {
    const searchUsers = async () => {
      if (query.length < 2) {
        setUsers([])
        return
      }

      setLoading(true)
      try {
        const results = await apiClient.searchUsers(query, 10)
        setUsers(results)
      } catch (error) {
        console.error('Search failed:', error)
        toast.error('Search failed')
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  const handleUserClick = (user: SearchUser) => {
    navigate(`/users/${user.id}`)
    onClose()
  }

  const handleFollowUser = async (e: React.MouseEvent, user: SearchUser) => {
    e.stopPropagation()
    try {
      await apiClient.sendFollowRequest(user.id)
      toast.success(`Follow request sent to @${user.username}`)
      // Update the user in the results to show request was sent
      setUsers(prev => prev.map(u => 
        u.id === user.id 
          ? { ...u, isFollowing: true } // Hide follow button after request is sent
          : u
      ))
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to send follow request'
      toast.error(message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-gray-200 px-4">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for users, tracks..."
            className="flex-1 px-3 py-4 text-sm outline-none"
          />
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-mono ${
              activeTab === 'all' 
                ? 'border-b-2 border-black' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            all
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-mono ${
              activeTab === 'users' 
                ? 'border-b-2 border-black' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            users
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`px-4 py-2 text-sm font-mono ${
              activeTab === 'tracks' 
                ? 'border-b-2 border-black' 
                : 'text-gray-500 hover:text-black'
            }`}
          >
            tracks
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 font-mono">
              start typing to search for users...
            </div>
          ) : loading ? (
            <div className="p-8 text-center text-sm text-gray-500 font-mono">
              searching...
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 font-mono">
              no users found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {users
                .filter(() => activeTab === 'all' || activeTab === 'users')
                .map((user) => (
                <div
                  key={user.id}
                  className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                >
                  <button
                    className="flex items-center space-x-3 flex-1 text-left"
                    onClick={() => handleUserClick(user)}
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium truncate">
                          @{user.username}
                        </span>
                        {user.verified && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      {user.displayName && (
                        <div className="text-xs text-gray-500 font-mono truncate">
                          {user.displayName}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 font-mono">
                        {user.stats.tracks} tracks • {user.stats.followers} followers
                      </div>
                    </div>
                  </button>
                  
                  {!user.isFollowing && (
                    <button
                      onClick={(e) => handleFollowUser(e, user)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-3 px-3 py-1 bg-black text-white text-xs font-mono rounded hover:bg-gray-800 flex items-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      follow
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <div className="flex space-x-4">
            <span><kbd className="px-1 bg-gray-100 rounded">↑↓</kbd> to navigate</span>
            <span><kbd className="px-1 bg-gray-100 rounded">Enter</kbd> to select</span>
            <span><kbd className="px-1 bg-gray-100 rounded">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  )
}