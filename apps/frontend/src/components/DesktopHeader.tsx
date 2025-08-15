import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, User as UserIcon, Settings, LogOut, ChevronDown, Upload, Bell } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import SearchDropdown from './SearchDropdown'
import NotificationsDropdown from './NotificationsDropdown'
import UploadDropdown from './UploadDropdown'
import { apiClient } from '../lib/api-client'

export default function DesktopHeader() {
  const { user, userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [uploadDropdownOpen, setUploadDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationButtonRef = useRef<HTMLButtonElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)
  const uploadButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user) {
        try {
          const response = await apiClient.getUnreadNotificationCount()
          setUnreadCount(response.count)
        } catch (error) {
          console.error('Failed to fetch unread notification count:', error)
        }
      }
    }

    fetchUnreadCount()
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [user])


  return (
    <>
      <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-end">
        <div className="flex items-center">
          {/* Primary Actions Group - center-right */}
          <div className="flex items-center gap-2 mr-3">
            {/* Upload Button - medium weight */}
            <button
              ref={uploadButtonRef}
              onClick={() => setUploadDropdownOpen(!uploadDropdownOpen)}
              className="flex items-center gap-2 h-9 px-3 border border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg transition-all text-sm"
            >
              <Upload className="w-4 h-4 text-gray-600" />
              <span className="font-mono text-gray-700">Upload</span>
            </button>

            {/* Search Bar */}
            <button
              ref={searchButtonRef}
              onClick={() => setSearchOpen(!searchOpen)}
              className={`flex items-center gap-2 h-9 px-3 ${searchOpen ? 'bg-gray-100 border-gray-400' : 'bg-gray-50 hover:bg-gray-100 border-gray-200'} border rounded-lg transition-colors min-w-[260px]`}
            >
              <Search className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-500 flex-1 text-left">Search tracks, projects...</span>
              <kbd className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-300 font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-gray-200" />

          {/* Passive Items Group - far right */}
          <div className="flex items-center gap-1 ml-3">
            {/* Notifications Button */}
            <button
              ref={notificationButtonRef}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className={`relative flex items-center justify-center h-9 w-9 ${notificationsOpen ? 'bg-gray-100' : 'hover:bg-gray-50'} rounded-lg transition-all`}
            >
              <Bell className="w-4 h-4 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-mono">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Account Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1.5 h-9 pl-1.5 pr-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </div>
                <ChevronDown className="w-3 h-3 text-gray-500" />
              </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium font-mono">
                    {userProfile?.username ? `@${userProfile.username}` : user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate font-mono">{user?.email}</p>
                </div>
                
                {userProfile && (
                  <Link
                    to={`/users/${userProfile.id}`}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-mono"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>view profile</span>
                  </Link>
                )}
                
                <Link
                  to="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-mono"
                >
                  <Settings className="w-4 h-4" />
                  <span>settings</span>
                </Link>
                
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    logout()
                  }}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left font-mono"
                >
                  <LogOut className="w-4 h-4" />
                  <span>logout</span>
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Search Dropdown */}
      <SearchDropdown 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)}
        anchorElement={searchButtonRef.current}
      />
      
      {/* Notifications Dropdown */}
      <NotificationsDropdown 
        isOpen={notificationsOpen} 
        onClose={() => {
          setNotificationsOpen(false)
          // Refresh unread count after closing
          if (user) {
            apiClient.getUnreadNotificationCount()
              .then(response => setUnreadCount(response.count))
              .catch(console.error)
          }
        }}
        anchorElement={notificationButtonRef.current}
      />
      
      {/* Upload Dropdown */}
      <UploadDropdown 
        isOpen={uploadDropdownOpen} 
        onClose={() => setUploadDropdownOpen(false)}
        anchorElement={uploadButtonRef.current}
      />
    </>
  )
}