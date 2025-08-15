import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Users, 
  Settings, 
  CreditCard, 
  Shield, 
  Plus, 
  X,
  Building2,
  User as UserIcon,
  Crown
} from 'lucide-react'
import { useWorkspace } from '../contexts/WorkspaceContext'
import toast from 'react-hot-toast'

interface Tab {
  id: string
  label: string
  icon: any
}

const tabs: Tab[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'security', label: 'Security', icon: Shield }
]

const roleOptions = [
  { value: 'VIEWER', label: 'Viewer', description: 'Can view tracks and projects' },
  { value: 'MEMBER', label: 'Member', description: 'Can add and edit content' },
  { value: 'ADMIN', label: 'Admin', description: 'Can manage workspace and members' }
]

export default function WorkspaceSettings() {
  const {  } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { 
    currentWorkspace, 
    updateWorkspace, 
    inviteMember, 
    removeMember, 
    updateMemberRole
  } = useWorkspace()
  
  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('MEMBER')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  
  // Form state for general settings
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: ''
  })

  useEffect(() => {
    if (currentWorkspace) {
      setFormData({
        name: currentWorkspace.name,
        slug: currentWorkspace.slug,
        description: currentWorkspace.description || ''
      })
    }
  }, [currentWorkspace])

  if (!currentWorkspace) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="p-6 lg:p-8">
          <p className="text-gray-500">Workspace not found</p>
        </div>
      </div>
    )
  }

  const isOwner = currentWorkspace.currentUserRole === 'OWNER'
  const isAdmin = currentWorkspace.currentUserRole === 'ADMIN'
  const canManageMembers = isOwner || isAdmin

  const handleSaveGeneral = async () => {
    setLoading(true)
    try {
      await updateWorkspace(currentWorkspace.id, formData)
      toast.success('Workspace settings updated')
    } catch (error) {
      console.error('Failed to update workspace:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail) {
      toast.error('Please enter an email address')
      return
    }

    setLoading(true)
    try {
      await inviteMember(inviteEmail, inviteRole)
      setInviteEmail('')
      setInviteRole('MEMBER')
      setShowInviteForm(false)
    } catch (error) {
      console.error('Failed to invite member:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    
    try {
      await removeMember(memberId)
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(memberId, newRole)
      setEditingMember(null)
    } catch (error) {
      console.error('Failed to update role:', error)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-mono rounded flex items-center gap-1">
          <Crown className="w-3 h-3" /> Owner
        </span>
      case 'ADMIN':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">Admin</span>
      case 'MEMBER':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded">Member</span>
      case 'VIEWER':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-mono rounded">Viewer</span>
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              back
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                {currentWorkspace.imageUrl ? (
                  <img 
                    src={currentWorkspace.imageUrl} 
                    alt={currentWorkspace.name}
                    className="w-full h-full rounded object-cover"
                  />
                ) : currentWorkspace.isPersonal ? (
                  <UserIcon className="w-6 h-6 text-gray-500" />
                ) : (
                  <Building2 className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-mono">{currentWorkspace.name} Settings</h1>
                <p className="text-sm text-gray-500 font-mono">
                  {currentWorkspace.billingTier} workspace • {currentWorkspace.memberCount} members
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
              {tabs.map(tab => {
                const Icon = tab.icon
                const disabled = (tab.id === 'members' && !canManageMembers) || 
                               (tab.id === 'billing' && !isOwner) ||
                               (tab.id === 'security' && !isOwner)
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => !disabled && setActiveTab(tab.id)}
                    disabled={disabled}
                    className={`px-4 py-2 font-mono text-sm flex items-center gap-2 border-b-2 transition-colors ${
                      activeTab === tab.id 
                        ? 'border-black text-black' 
                        : disabled
                        ? 'border-transparent text-gray-300 cursor-not-allowed'
                        : 'border-transparent text-gray-600 hover:text-black'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-mono text-gray-600 mb-2">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    disabled={!canManageMembers}
                    className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-mono text-gray-600 mb-2">
                    Workspace Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    disabled={!isOwner}
                    className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    wipshare.com/w/{formData.slug}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-mono text-gray-600 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!canManageMembers}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400 disabled:bg-gray-50 resize-none"
                  />
                </div>

                {canManageMembers && (
                  <button
                    onClick={handleSaveGeneral}
                    disabled={loading}
                    className="bg-black text-white px-4 py-2 font-mono text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            )}

            {/* Members */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Invite Member */}
                {canManageMembers && (
                  <div className="border border-gray-200 p-4 rounded-lg">
                    {!showInviteForm ? (
                      <button
                        onClick={() => setShowInviteForm(true)}
                        className="flex items-center gap-2 text-sm font-mono hover:text-blue-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Invite Member
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="Email address"
                            className="flex-1 px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400"
                          />
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="px-3 py-2 border border-gray-300 font-mono text-sm focus:outline-none focus:border-gray-400"
                          >
                            {roleOptions.map(role => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleInviteMember}
                            disabled={loading || !inviteEmail}
                            className="bg-black text-white px-4 py-2 font-mono text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400"
                          >
                            {loading ? 'Sending...' : 'Send Invite'}
                          </button>
                          <button
                            onClick={() => {
                              setShowInviteForm(false)
                              setInviteEmail('')
                              setInviteRole('MEMBER')
                            }}
                            className="px-4 py-2 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Members List */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-mono text-sm font-medium">
                      Workspace Members ({currentWorkspace.members?.length || 0})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {currentWorkspace.members?.map((member) => (
                      <div key={member.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            {member.user.avatarUrl ? (
                              <img 
                                src={member.user.avatarUrl} 
                                alt={member.user.displayName || member.user.username}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <UserIcon className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-mono text-sm">
                              {member.user.displayName || member.user.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              {member.user.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {editingMember === member.id && member.role !== 'OWNER' ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, e.target.value)}
                              onBlur={() => setEditingMember(null)}
                              autoFocus
                              className="px-2 py-1 border border-gray-300 font-mono text-xs focus:outline-none focus:border-gray-400"
                            >
                              {roleOptions.map(role => (
                                <option key={role.value} value={role.value}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div
                              onClick={() => isOwner && member.role !== 'OWNER' && setEditingMember(member.id)}
                              className={isOwner && member.role !== 'OWNER' ? 'cursor-pointer' : ''}
                            >
                              {getRoleBadge(member.role)}
                            </div>
                          )}

                          {canManageMembers && member.role !== 'OWNER' && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Billing */}
            {activeTab === 'billing' && (
              <div className="space-y-6 max-w-2xl">
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="font-mono text-sm font-medium mb-4">Current Plan</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Plan</span>
                      <span className="font-mono text-sm capitalize">{currentWorkspace.billingTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Members</span>
                      <span className="font-mono text-sm">{currentWorkspace.memberCount} / ∞</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tracks</span>
                      <span className="font-mono text-sm">{currentWorkspace.trackCount} / ∞</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Projects</span>
                      <span className="font-mono text-sm">{currentWorkspace.projectCount} / ∞</span>
                    </div>
                  </div>
                  
                  {currentWorkspace.billingTier === 'free' && (
                    <button className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 font-mono text-sm hover:opacity-90 transition-opacity">
                      Upgrade to Pro
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="space-y-6 max-w-2xl">
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm font-mono text-yellow-800">
                    Security settings coming soon. This will include SSO, 2FA requirements, and audit logs.
                  </p>
                </div>

                {/* Danger Zone */}
                <div className="border border-red-200 rounded-lg p-6">
                  <h3 className="font-mono text-sm font-medium text-red-600 mb-4">Danger Zone</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Once you delete a workspace, there is no going back. All data will be permanently deleted.
                  </p>
                  <button
                    disabled={!isOwner || currentWorkspace.isPersonal}
                    className="px-4 py-2 border border-red-300 text-red-600 font-mono text-sm hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}