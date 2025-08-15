import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Settings, Users, Building2, User, Loader2 } from 'lucide-react'
import { useWorkspace } from '../contexts/WorkspaceContext'
import { useNavigate } from 'react-router-dom'
import CreateWorkspaceModal from './CreateWorkspaceModal'

export default function WorkspaceSwitcher() {
  const navigate = useNavigate()
  const { workspaces, currentWorkspace, switchWorkspace, loading, switching } = useWorkspace()
  const [isOpen, setIsOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchWorkspace = async (workspaceId: string) => {
    if (workspaceId !== currentWorkspace?.id) {
      await switchWorkspace(workspaceId)
    }
    setIsOpen(false)
  }

  const handleCreateWorkspace = () => {
    setIsOpen(false)
    setShowCreateModal(true)
  }

  const handleWorkspaceSettings = () => {
    setIsOpen(false)
    navigate(`/workspace/${currentWorkspace?.slug}/settings`)
  }

  if (loading || !currentWorkspace) {
    return null
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1 hover:bg-gray-200 rounded transition-colors ${switching ? 'opacity-50 cursor-wait' : ''}`}
        title={currentWorkspace.name}
        disabled={switching}
      >
        {switching ? (
          <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin" />
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 shadow-lg z-50 max-h-96 overflow-y-auto rounded-md">
          {/* Current workspace header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-mono text-gray-500 uppercase mb-1">Current</div>
            <div className="flex items-center gap-2">
              {currentWorkspace.isPersonal ? (
                <User className="w-3 h-3 text-gray-400" />
              ) : (
                <Building2 className="w-3 h-3 text-gray-400" />
              )}
              <span className="text-xs font-medium text-gray-900 truncate">
                {currentWorkspace.isPersonal ? 'Personal' : currentWorkspace.name}
              </span>
            </div>
          </div>

          {/* Other workspaces */}
          {workspaces.length > 1 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs font-mono text-gray-500 uppercase">
                Switch to
              </div>
              {workspaces
                .filter(ws => ws.id !== currentWorkspace.id)
                .map(workspace => (
                  <button
                    key={workspace.id}
                    onClick={() => handleSwitchWorkspace(workspace.id)}
                    className={`w-full px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-2 group ${switching ? 'opacity-50 cursor-wait' : ''}`}
                    disabled={switching}
                  >
                    <div className="flex-shrink-0">
                      {workspace.isPersonal ? (
                        <User className="w-3 h-3 text-gray-400" />
                      ) : (
                        <Building2 className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-mono text-xs truncate">
                        {workspace.isPersonal ? 'Personal' : workspace.name}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-gray-200 py-1">
            <button
              onClick={handleCreateWorkspace}
              className="w-full px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs font-mono text-gray-600"
            >
              <Plus className="w-3.5 h-3.5" />
              New Workspace
            </button>
            
            {currentWorkspace && !currentWorkspace.isPersonal && (
              <>
                <button
                  onClick={handleWorkspaceSettings}
                  className="w-full px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs font-mono text-gray-600"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </button>
                
                {(currentWorkspace.currentUserRole === 'OWNER' || currentWorkspace.currentUserRole === 'ADMIN') && (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      navigate(`/workspace/${currentWorkspace.slug}/members`)
                    }}
                    className="w-full px-3 py-1.5 hover:bg-gray-50 transition-colors flex items-center gap-2 text-xs font-mono text-gray-600"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Members
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Create Workspace Modal */}
      <CreateWorkspaceModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
    </div>
  )
}