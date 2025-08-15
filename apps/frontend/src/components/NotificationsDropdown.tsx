import { useEffect, useRef, useState } from 'react'
import { apiClient } from '../lib/api-client'
import { UserPlus, MessageCircle, Heart, Music, X, Check, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface NotificationsDropdownProps {
  isOpen: boolean
  onClose: () => void
  anchorElement: HTMLElement | null
}

export default function NotificationsDropdown({ isOpen, onClose, anchorElement }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
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

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getNotifications(1, 10, false)
      setNotifications(response.notifications || [])
      
      // Mark all as read after showing
      if (response.notifications?.length > 0) {
        setTimeout(() => {
          apiClient.markAllNotificationsAsRead().catch(console.error)
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationClick = (notification: any) => {
    // Navigate based on notification type
    if (notification.type === 'follow_request') {
      navigate('/follow-requests')
    } else if (notification.relatedTrackId) {
      navigate(`/track/${notification.relatedTrackId}`)
    } else if (notification.relatedUserId) {
      navigate(`/user/${notification.relatedUserId}`)
    }
    onClose()
  }

  const handleApproveFollowRequest = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation()
    try {
      await apiClient.respondToFollowRequest(requestId, 'approve')
      // Remove from list
      setNotifications(prev => prev.filter(n => n.relatedId !== requestId))
    } catch (error) {
      console.error('Failed to approve follow request:', error)
    }
  }

  const handleRejectFollowRequest = async (e: React.MouseEvent, requestId: string) => {
    e.stopPropagation()
    try {
      await apiClient.respondToFollowRequest(requestId, 'reject')
      // Remove from list
      setNotifications(prev => prev.filter(n => n.relatedId !== requestId))
    } catch (error) {
      console.error('Failed to reject follow request:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow_request':
      case 'follow_approved':
        return <UserPlus className="w-4 h-4" />
      case 'comment':
        return <MessageCircle className="w-4 h-4" />
      case 'like':
        return <Heart className="w-4 h-4" />
      case 'new_version':
        return <Music className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffMs = now.getTime() - notificationDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return notificationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!isOpen || !anchorElement) return null

  // Calculate position based on anchor element
  const rect = anchorElement.getBoundingClientRect()
  const dropdownStyle = {
    position: 'fixed' as const,
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
    zIndex: 50
  }

  return (
    <div 
      ref={dropdownRef}
      className="bg-white border border-gray-200 rounded-lg shadow-lg w-96 max-h-[500px] overflow-hidden animate-fade-in-scale"
      style={dropdownStyle}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-mono font-medium">Notifications</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[420px]">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-black"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-mono">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${
                    !notification.isRead ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                    
                    {/* Follow request actions */}
                    {notification.type === 'follow_request' && notification.relatedId && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => handleApproveFollowRequest(e, notification.relatedId)}
                          className="flex items-center gap-1 px-2 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={(e) => handleRejectFollowRequest(e, notification.relatedId)}
                          className="flex items-center gap-1 px-2 py-1 border border-gray-300 text-xs rounded hover:bg-gray-50 transition-colors"
                        >
                          <X className="w-3 h-3" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <button
            onClick={() => {
              navigate('/follow-requests')
              onClose()
            }}
            className="text-xs text-gray-600 hover:text-black font-mono transition-colors"
          >
            View all notifications →
          </button>
        </div>
      )}
    </div>
  )
}