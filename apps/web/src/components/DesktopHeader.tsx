import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, User as UserIcon, Settings, LogOut, ChevronDown, Upload, Bell } from 'lucide-react'
import { useAuth } from '../lib/stytch-auth-context'
import SearchDropdown from './SearchDropdown'
import NotificationsDropdown from './NotificationsDropdown'
import UploadDropdown from './UploadDropdown'
import { apiClient } from '../lib/api-client'

export default function DesktopHeader() {
  const { user, userProfile, signOut } = useAuth()
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
    if (!user) return
    apiClient.getUnreadNotificationCount()
      .then(response => setUnreadCount(response.count))
      .catch(() => {})
  }, [user])

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
      <div className="px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-sm font-semibold tracking-tight">wipshare</Link>
            <button
              ref={searchButtonRef}
              onClick={() => setSearchOpen(true)}
              className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-black"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="font-mono">search</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              ref={uploadButtonRef}
              onClick={() => setUploadDropdownOpen(!uploadDropdownOpen)}
              className={`relative flex items-center justify-center h-9 w-9 ${uploadDropdownOpen ? 'bg-gray-100' : 'hover:bg-gray-50'} rounded-lg transition-all`}
            >
              <Upload className="w-4 h-4 text-gray-600" />
            </button>

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
                  {user?.imageUrl ? (
                    <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
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
                    {userProfile?.username ? `@${userProfile.username}` : user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate font-mono">{user?.email}</p>
                </div>
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
                    signOut?.()
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
      </div>
    </header>
  )
}