import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Menu } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import SearchModal from './SearchModal'
import MobileSidebar from './MobileSidebar'

export default function Header() {
  const { user } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const handleMenuClick = () => {
    setSidebarOpen(true)
  }

  return (
    <>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-30">
        <div className="px-4">
          <div className="flex items-center justify-between h-14">
            {/* Hamburger menu button */}
            <button
              onClick={handleMenuClick}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo */}
            <Link to={user ? "/dashboard" : "/"} className="text-sm font-semibold tracking-tight">
              wipshare
            </Link>

            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar */}
      <MobileSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}