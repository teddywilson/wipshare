import { useEffect, useState } from 'react'
import { WifiOff, AlertCircle } from 'lucide-react'
import { apiClient } from '../lib/api-client'

export default function ConnectionStatus() {
  const [status, setStatus] = useState<'online' | 'offline' | 'error'>('online')
  const [message, setMessage] = useState<string>('')
  
  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setStatus('online')
      setMessage('')
    }
    
    const handleOffline = () => {
      setStatus('offline')
      setMessage('No internet connection')
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Check initial status
    if (!navigator.onLine) {
      handleOffline()
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  // Subscribe to API connection status
  useEffect(() => {
    const unsubscribe = apiClient.onConnectionChange((isConnected, errorMessage) => {
      if (isConnected) {
        setStatus('online')
        setMessage('')
      } else if (errorMessage) {
        setStatus('error')
        setMessage(errorMessage)
      }
    })
    
    return unsubscribe
  }, [])
  
  if (status === 'online') {
    return null // Don't show anything when everything is working
  }
  
  return (
    <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg flex items-center space-x-2 text-sm shadow-lg z-50 ${
      status === 'offline' ? 'bg-gray-900 text-white' : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      {status === 'offline' ? (
        <WifiOff className="w-4 h-4" />
      ) : (
        <AlertCircle className="w-4 h-4" />
      )}
      <span>{message}</span>
    </div>
  )
}