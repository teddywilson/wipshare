import { Outlet } from 'react-router-dom'
import Header from './Header'
import DesktopHeader from './DesktopHeader'
import Sidebar from './Sidebar'
import Player from './Player'
import { PlayerProvider } from '../contexts/PlayerContext'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/stytch-auth-context'

export default function AuthenticatedLayout() {
  const { switching } = useWorkspace()
  const { isLoading } = useAuth()
  
  const showLoadingOverlay = (switching || isLoading)
  
  return (
    <PlayerProvider>
      <div className="min-h-screen bg-white">
      {/* Mobile Header */}
      <div className="md:hidden">
        <Header />
        <main id="main-content" className="w-full pb-16 relative">
          {showLoadingOverlay && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="font-mono text-sm">
                  switching workspace...
                </span>
              </div>
            </div>
          )}
          <Outlet />
        </main>
      </div>
      
      {/* Desktop Layout with Sidebar and Header */}
      <div className="hidden md:flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <DesktopHeader />
          <main id="main-content" className="flex-1 overflow-y-auto pb-16 relative">
            {showLoadingOverlay && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-40 flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-mono text-sm">
                    switching workspace...
                  </span>
                </div>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Global Player - Always at bottom */}
      <Player />
    </div>
    </PlayerProvider>
  )
}