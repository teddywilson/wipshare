import { useState, useEffect, useCallback } from 'react'
import { User, Check, X, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../lib/api-client'
import toast from 'react-hot-toast'

interface FollowRequest {
  id: string
  user: {
    id: string
    username: string
    displayName?: string
    avatarUrl?: string
    verified: boolean
  }
  requestedAt: string
}

export default function FollowRequests() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<FollowRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
  const [hasLoaded, setHasLoaded] = useState(false)

  const fetchRequests = useCallback(async () => {
    // Don't show loading spinner on subsequent fetches
    if (!hasLoaded) {
      setLoading(true)
    }
    
    try {
      const response = await apiClient.getPendingFollowRequests()
      setRequests(response.requests || [])
      setHasLoaded(true)
    } catch (error) {
      console.error('Failed to fetch follow requests:', error)
      if (!hasLoaded) {
        toast.error('Failed to load follow requests')
      }
    } finally {
      setLoading(false)
    }
  }, [hasLoaded])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set([...prev, requestId]))
    
    try {
      await apiClient.respondToFollowRequest(requestId, action)
      
      // Remove the request from the list
      setRequests(prev => prev.filter(req => req.id !== requestId))
      
      const actionText = action === 'approve' ? 'approved' : 'rejected'
      toast.success(`Follow request ${actionText}`)
    } catch (error: any) {
      const message = error.response?.data?.message || `Failed to ${action} request`
      toast.error(message)
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      if (diffInHours === 0) {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
        return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes}m ago`
      }
      return `${diffInHours}h ago`
    } else if (diffInDays === 1) {
      return '1 day ago'
    } else {
      return `${diffInDays} days ago`
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8 max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-mono mb-1">follow requests</h1>
              <p className="text-sm text-gray-600 font-mono">
                approve or reject requests to follow you
              </p>
            </div>
          </div>

          {loading ? (
            /* Loading State */
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-200 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
                      <div className="h-3 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                    <div className="h-8 w-16 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-mono font-medium text-gray-900 mb-2">
                no pending requests
              </h2>
              <p className="text-sm text-gray-500 font-mono">
                when someone wants to follow you, their request will appear here
              </p>
            </div>
          ) : (
            /* Requests List */
            <div className="space-y-3">
              {requests.map((request) => (
                <div 
                  key={request.id} 
                  className="flex items-center justify-between p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    {request.user.avatarUrl ? (
                      <img
                        src={request.user.avatarUrl}
                        alt={request.user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">
                          @{request.user.username}
                        </span>
                        {request.user.verified && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      {request.user.displayName && (
                        <div className="text-xs text-gray-600 font-mono">
                          {request.user.displayName}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 font-mono">
                        {formatTimeAgo(request.requestedAt)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequest(request.id, 'reject')}
                      disabled={processingIds.has(request.id)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 hover:border-red-300 hover:bg-red-50 text-sm font-mono transition-colors disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      reject
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, 'approve')}
                      disabled={processingIds.has(request.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-black text-white hover:bg-gray-800 text-sm font-mono transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}