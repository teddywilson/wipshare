import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { User, UserPlus, UserMinus, Music, Users, UserCheck, Plus, MapPin, Check } from 'lucide-react'
import { apiClient } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  username: string
  displayName?: string
  bio?: string
  avatarUrl?: string
  location?: string
  verified: boolean
  createdAt: string
  stats: {
    followers: number
    following: number
  }
  followStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  isFollowing?: boolean
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>()
  const { userProfile: currentUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [followLoading, setFollowLoading] = useState(false)
  const [channels, setChannels] = useState<any[]>([])
  const [, setChannelsLoading] = useState(false)

  useEffect(() => {
    if (id) {
      fetchProfile()
    }
  }, [id])

  useEffect(() => {
    if (profile) {
      fetchChannels()
    }
  }, [profile, currentUser])

  const fetchProfile = async () => {
    if (!id) return
    
    setLoading(true)
    try {
      const response = await apiClient.getUserProfile(id)
      setProfile(response.user)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchChannels = async () => {
    if (!id) return
    
    // Only fetch channels if viewing own profile or if we're an approved follower
    const isOwnProfile = currentUser?.id === id
    if (!isOwnProfile && profile && profile.followStatus !== 'APPROVED') {
      return
    }
    
    setChannelsLoading(true)
    try {
      const response = await apiClient.getUserProjects()
      setChannels(response.projects || [])
    } catch (error) {
      console.error('Failed to fetch channels:', error)
      // Don't show error for channels, just keep empty array
    } finally {
      setChannelsLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!profile) return
    
    setFollowLoading(true)
    try {
      if (profile.followStatus === 'PENDING' || profile.followStatus === 'APPROVED') {
        // Cancel request or unfollow
        await apiClient.unfollowUser(profile.id)
        setProfile(prev => prev ? {
          ...prev,
          followStatus: null,
          isFollowing: false,
          stats: {
            ...prev.stats,
            followers: profile.followStatus === 'APPROVED' ? Math.max(0, prev.stats.followers - 1) : prev.stats.followers
          }
        } : null)
        
        const message = profile.followStatus === 'PENDING' 
          ? `Follow request cancelled` 
          : `Unfollowed @${profile.username}`
        toast.success(message)
      } else {
        // Send follow request
        await apiClient.sendFollowRequest(profile.id)
        setProfile(prev => prev ? {
          ...prev,
          followStatus: 'PENDING',
          isFollowing: false
        } : null)
        toast.success(`Follow request sent to @${profile.username}`)
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update follow status'
      toast.error(message)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-4xl mx-auto animate-pulse">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-24 h-24 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
                <div className="h-10 bg-gray-200 rounded w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="text-center py-16">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-mono font-medium text-gray-900 mb-2">
                User not found
              </h2>
              <p className="text-sm text-gray-500 font-mono">
                The user you're looking for doesn't exist or has been removed.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          {/* Profile Header */}
          <div className="flex items-start gap-6 mb-8">
            {/* Avatar */}
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-12 h-12 text-gray-500" />
              </div>
            )}

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-mono font-medium">
                  @{profile.username}
                </h1>
                {profile.verified && (
                  <div 
                    className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0"
                    title="Verified user"
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {profile.displayName && (
                <p className="text-lg text-gray-600 font-mono mb-3">
                  {profile.displayName}
                </p>
              )}

              {profile.bio && (
                <p className="text-sm text-gray-700 font-mono mb-4 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {profile.location && (
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600 font-mono">
                    {profile.location}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mb-4 text-sm font-mono">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{profile.stats.followers}</span>
                  <span className="text-gray-500">followers</span>
                </div>
                <div className="flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{profile.stats.following}</span>
                  <span className="text-gray-500">following</span>
                </div>
              </div>

              {/* Follow Button */}
              {!isOwnProfile && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`inline-flex items-center gap-2 px-6 py-2 text-sm font-mono transition-colors disabled:opacity-50 ${
                    profile.followStatus === 'APPROVED'
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                      : profile.followStatus === 'PENDING'
                      ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-300'
                      : 'bg-black text-white hover:bg-gray-800 border border-black'
                  }`}
                >
                  {followLoading ? (
                    'loading...'
                  ) : profile.followStatus === 'APPROVED' ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      unfollow
                    </>
                  ) : profile.followStatus === 'PENDING' ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      cancel request
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      follow
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Content Sections */}
          <div className="border-t border-gray-200">
            <div className="flex border-b border-gray-200">
              <button className="px-6 py-3 text-sm font-mono border-b-2 border-black">
                channels
              </button>
            </div>

            {/* Channels Section */}
            <div className="py-8">
              {!isOwnProfile && profile.followStatus !== 'APPROVED' ? (
                /* Access restricted for non-approved followers */
                <div className="text-center py-16">
                  <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-mono font-medium text-gray-900 mb-2">
                    Private content
                  </h3>
                  <p className="text-sm text-gray-500 font-mono mb-4">
                    Follow @{profile.username} to see their channels and tracks
                  </p>
                  {profile.followStatus === 'PENDING' && (
                    <p className="text-xs text-yellow-600 font-mono">
                      Your follow request is pending approval
                    </p>
                  )}
                </div>
              ) : channels.length === 0 ? (
                /* Empty state for approved followers or own profile */
                <div className="text-center py-16">
                  <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-mono font-medium text-gray-900 mb-2">
                    No channels yet
                  </h3>
                  <p className="text-sm text-gray-500 font-mono mb-6">
                    {isOwnProfile 
                      ? 'Create your first channel to organize and share your music!'
                      : `@${profile.username} hasn't created any channels yet.`
                    }
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={() => window.location.href = '/projects'}
                      className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-sm font-mono hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      create your first channel
                    </button>
                  )}
                </div>
              ) : (
                /* Channels content for approved access */
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="aspect-square bg-gray-100 mb-4 flex items-center justify-center">
                        {channel.imageUrl ? (
                          <img src={channel.imageUrl} alt={channel.title} className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-mono font-medium text-sm">{channel.title}</h4>
                        {channel.description && (
                          <p className="text-xs text-gray-600 font-mono leading-relaxed line-clamp-2">
                            {channel.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 font-mono">
                          {channel.trackCount || 0} tracks
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}