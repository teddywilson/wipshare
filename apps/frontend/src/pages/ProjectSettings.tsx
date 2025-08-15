import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, Users, User, Crown, Edit, Trash2, Mail, MoreHorizontal, UserPlus, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { 
  useProject, 
  useUpdateProject
} from '../hooks/useProjectQueries'
import {
  useProjectMembers,
  useInviteProjectMember,
  useRemoveProjectMember,
  useUpdateProjectMemberRole,
  useCancelProjectInvitation,
  useResendProjectInvitation
} from '../hooks/useProjectMemberQueries'
import InviteMemberModal from '../components/InviteMemberModal'

// Define interfaces for the project member management
interface ProjectMember {
  id: string
  userId: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  joinedAt: string
  user: {
    id: string
    username: string
    displayName?: string
    email: string
    avatarUrl?: string
  }
}

interface ProjectInvitation {
  id: string
  email: string
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  expiresAt: string
  createdAt: string
  inviter?: {
    username: string
    displayName?: string
  }
}

type TabType = 'general' | 'members'

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabType>('general')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedType, setEditedType] = useState('')

  // Queries
  const { data: project, isLoading: projectLoading, error: projectError } = useProject(id)
  const { data: membersData, isLoading: membersLoading } = useProjectMembers(id)

  // Mutations
  const updateProjectMutation = useUpdateProject()
  const removeProjectMemberMutation = useRemoveProjectMember()
  const updateProjectMemberRoleMutation = useUpdateProjectMemberRole()
  const cancelProjectInvitationMutation = useCancelProjectInvitation()
  const resendProjectInvitationMutation = useResendProjectInvitation()

  const members: ProjectMember[] = membersData?.members || []
  const invitations: ProjectInvitation[] = membersData?.invitations || []

  useEffect(() => {
    if (project) {
      setEditedTitle(project.title)
      setEditedDescription(project.description || '')
      setEditedType(project.type)
    }
  }, [project])

  const handleSaveChanges = async () => {
    if (!editedTitle.trim()) return
    
    try {
      await updateProjectMutation.mutateAsync({
        projectId: id!,
        data: {
          title: editedTitle.trim(),
          description: editedDescription.trim() || undefined,
          type: editedType
        }
      })
      
      setIsEditMode(false)
      toast.success('Project updated successfully')
    } catch (error) {
      console.error('Failed to update project:', error)
      toast.error('Failed to update project')
    }
  }

  const handleCancelEdit = () => {
    if (project) {
      setEditedTitle(project.title)
      setEditedDescription(project.description || '')
      setEditedType(project.type)
    }
    setIsEditMode(false)
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this project?`)) return

    try {
      await removeProjectMemberMutation.mutateAsync({
        projectId: id!,
        memberId
      })
      toast.success(`${memberName} removed from project`)
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove member')
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: string, memberName: string) => {
    try {
      await updateProjectMemberRoleMutation.mutateAsync({
        projectId: id!,
        memberId,
        role: newRole
      })
      toast.success(`${memberName}'s role updated to ${newRole}`)
    } catch (error) {
      console.error('Failed to update member role:', error)
      toast.error('Failed to update member role')
    }
  }

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    try {
      await cancelProjectInvitationMutation.mutateAsync({
        projectId: id!,
        invitationId
      })
      toast.success(`Invitation to ${email} cancelled`)
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
      toast.error('Failed to cancel invitation')
    }
  }

  const handleResendInvitation = async (invitationId: string, email: string) => {
    try {
      await resendProjectInvitationMutation.mutateAsync({
        projectId: id!,
        invitationId
      })
      toast.success(`Invitation resent to ${email}`)
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      toast.error('Failed to resend invitation')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getRoleIcon = (role: string) => {
    switch (role.toUpperCase()) {
      case 'OWNER': return <Crown className="w-4 h-4 text-yellow-600" />
      case 'EDITOR': return <Edit className="w-4 h-4 text-blue-600" />
      case 'VIEWER': return <User className="w-4 h-4 text-gray-600" />
      default: return <User className="w-4 h-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role.toUpperCase()) {
      case 'OWNER': return 'text-yellow-700 bg-yellow-50'
      case 'EDITOR': return 'text-blue-700 bg-blue-50'
      case 'VIEWER': return 'text-gray-700 bg-gray-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  if (projectLoading) {
    return (
      <div className="flex-1 p-6">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          back to project
        </button>
        <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          loading project settings...
        </div>
      </div>
    )
  }

  if (projectError || !project) {
    return (
      <div className="flex-1 p-6">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          back to project
        </button>
        <div className="text-sm font-mono text-red-600">
          {projectError ? 'Failed to load project' : 'Project not found'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="inline-flex items-center gap-2 text-sm font-mono text-gray-600 hover:text-black mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            back to project
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <Settings className="w-5 h-5 text-gray-600" />
            <h1 className="text-xl font-mono">{project.title} Settings</h1>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-mono border-b-2 transition-colors ${
                activeTab === 'general'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 text-sm font-mono border-b-2 transition-colors ${
                activeTab === 'members'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-600 hover:text-black'
              }`}
            >
              Members
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && (
          <div className="space-y-8">
            {/* Project Information */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-mono text-gray-600">Project Information</h2>
                {!isEditMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="text-sm font-mono text-gray-600 hover:text-black flex items-center gap-2 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>

              {isEditMode ? (
                <div className="space-y-4 border border-gray-200 p-4 rounded">
                  <div>
                    <label className="block text-sm font-mono text-gray-700 mb-1.5">Title</label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                      disabled={updateProjectMutation.isPending}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-mono text-gray-700 mb-1.5">Type</label>
                    <select
                      value={editedType}
                      onChange={(e) => setEditedType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                      disabled={updateProjectMutation.isPending}
                    >
                      <option value="collection">Collection</option>
                      <option value="album">Album</option>
                      <option value="ep">EP</option>
                      <option value="single">Single</option>
                      <option value="playlist">Playlist</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-mono text-gray-700 mb-1.5">Description</label>
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm resize-none"
                      placeholder="Project description..."
                      disabled={updateProjectMutation.isPending}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSaveChanges}
                      disabled={updateProjectMutation.isPending || !editedTitle.trim()}
                      className="px-4 py-2 bg-black text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                    >
                      {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateProjectMutation.isPending}
                      className="px-4 py-2 border border-gray-300 font-mono text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-gray-600 w-20">Title:</span>
                    <span className="text-sm font-mono">{project.title}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-gray-600 w-20">Type:</span>
                    <span className="text-sm font-mono capitalize">{project.type}</span>
                  </div>
                  {project.description && (
                    <div className="flex gap-4">
                      <span className="text-sm font-mono text-gray-600 w-20">Description:</span>
                      <span className="text-sm font-mono text-gray-700">{project.description}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-gray-600 w-20">Created:</span>
                    <span className="text-sm font-mono">{formatDate(project.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-8">
            {/* Current Members */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-mono text-gray-600">Project Members</h2>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white text-sm font-mono hover:bg-gray-800 transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  Invite Member
                </button>
              </div>

              {membersLoading ? (
                <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                  Loading members...
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 border border-gray-200 rounded">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-mono text-gray-400">No members yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {member.user.avatarUrl ? (
                            <img 
                              src={member.user.avatarUrl} 
                              alt={member.user.displayName || member.user.username}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-mono">
                            {member.user.displayName || member.user.username}
                          </div>
                          <div className="text-xs font-mono text-gray-500">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${getRoleColor(member.role)}`}>
                          {getRoleIcon(member.role)}
                          {member.role}
                        </div>
                        
                        {member.role !== 'OWNER' && (
                          <div className="relative">
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateMemberRole(member.id, e.target.value, member.user.displayName || member.user.username)}
                              className="text-xs font-mono border border-gray-300 px-2 py-1 rounded focus:outline-none focus:border-gray-400"
                              disabled={removeProjectMemberMutation.isPending || updateProjectMemberRoleMutation.isPending}
                            >
                              <option value="VIEWER">Viewer</option>
                              <option value="EDITOR">Editor</option>
                              <option value="OWNER">Owner</option>
                            </select>
                          </div>
                        )}
                        
                        {member.role !== 'OWNER' && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.user.displayName || member.user.username)}
                            disabled={removeProjectMemberMutation.isPending}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Invitations */}
            <div>
              <h2 className="text-sm font-mono text-gray-600 mb-4">Pending Invitations</h2>
              
              {membersLoading ? (
                <div className="flex items-center gap-2 text-sm font-mono text-gray-600">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
                  Loading invitations...
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-6 border border-gray-200 rounded">
                  <Mail className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-mono text-gray-400">No pending invitations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Mail className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-mono">{invitation.email}</div>
                          <div className="text-xs font-mono text-gray-500">
                            Invited {formatDate(invitation.createdAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${getRoleColor(invitation.role)}`}>
                          {getRoleIcon(invitation.role)}
                          {invitation.role}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-orange-500" />
                          <span className="text-xs font-mono text-orange-600">Pending</span>
                        </div>
                        
                        <button
                          onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                          disabled={resendProjectInvitationMutation.isPending}
                          className="text-xs font-mono text-gray-600 hover:text-black transition-colors"
                          title="Resend invitation"
                        >
                          Resend
                        </button>
                        
                        <button
                          onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                          disabled={cancelProjectInvitationMutation.isPending}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Cancel invitation"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        projectId={id!}
        projectTitle={project.title}
      />
    </div>
  )
}