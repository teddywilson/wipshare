import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth-context'
import toast from 'react-hot-toast'
import { User, Camera, Loader2 } from 'lucide-react'

export default function ProfileSettings() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is signed in via Google
  const isGoogleAccount = user?.providerData?.some(provider => provider.providerId === 'google.com') || false

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '')
      setUsername((user as any).username || '') // TODO: Add proper typing
      setEmail(user.email || '')
      setProfilePicture(user.photoURL || null)
    }
  }, [user])

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setImageUploading(true)
    try {
      // Simulate upload delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // For now, create a local preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfilePicture(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // TODO: Upload to cloud storage and update user profile
      toast.success('→ profile picture updated!')
    } catch (error) {
      console.error('Profile picture upload error:', error)
      toast.error('Failed to upload profile picture')
    } finally {
      setImageUploading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // For development, just show success message
      toast.success('Profile updated successfully (development mode)')
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // For development, just show success message
      toast.success('Email updated successfully (development mode)')
    } catch (error: any) {
      console.error('Email update error:', error)
      toast.error('Failed to update email')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setLoading(true)
    try {
      // For development, just show success message
      toast.success('Password updated successfully (development mode)')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Password update error:', error)
      toast.error('Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-2xl">
        <h1 className="text-xl font-mono mb-6">Settings</h1>

        <div className="space-y-8">
          {/* Profile Picture */}
          <div>
            <h2 className="text-sm font-mono text-gray-600 mb-4">Profile Picture</h2>
            <div className="flex items-start gap-6">
              <div className="relative group">
                <div className="w-20 h-20 bg-gray-100 overflow-hidden rounded-lg">
                  {profilePicture ? (
                    <img 
                      src={profilePicture} 
                      alt="Profile" 
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        imageUploading ? 'blur-sm' : 'group-hover:blur-sm'
                      }`}
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center transition-all duration-300 ${
                      imageUploading ? 'blur-sm' : 'group-hover:blur-sm'
                    }`}>
                      <User className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Loading overlay */}
                  {imageUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                      <div className="bg-white rounded-full p-2 shadow-lg">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-700" />
                      </div>
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  {!imageUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white rounded-full p-2 shadow-lg">
                        <Camera className="w-4 h-4 text-gray-700" />
                      </div>
                    </div>
                  )}
                </div>
                
                <button
                  type="button"
                  onClick={() => !imageUploading && fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="absolute inset-0 cursor-pointer"
                >
                  <span className="sr-only">Change profile picture</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                  disabled={imageUploading}
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => !imageUploading && fileInputRef.current?.click()}
                  disabled={imageUploading}
                  className="text-sm font-mono text-gray-600 hover:text-black disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {imageUploading ? 'Uploading...' : 'Choose image'}
                </button>
                <p className="text-xs text-gray-500 mt-1 font-mono">Max 5MB • JPG, PNG, GIF</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div>
            <h2 className="text-sm font-mono text-gray-600 mb-4">Profile</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1.5 font-mono">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                  placeholder="your_username"
                  pattern="[a-z0-9_]+"
                  minLength={3}
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  3-20 characters • lowercase letters, numbers, and underscores only
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1.5 font-mono">Display name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                  placeholder="Your display name"
                />
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Your public display name (can include spaces and special characters)
                </p>
              </div>
              <button
                type="submit"
                disabled={loading || (displayName === user?.displayName && username === (user as any)?.username)}
                className="px-4 py-2 bg-gray-900 text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
              >
                Save
              </button>
            </form>
          </div>

          {/* Email Settings */}
          <div>
            <h2 className="text-sm font-mono text-gray-600 mb-4">Email</h2>
            {isGoogleAccount ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">Email address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 bg-gray-50 text-gray-500 font-mono text-sm cursor-not-allowed"
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-2 font-mono">
                    → email managed by Google. To change your email, update it in your Google account settings.
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-mono">
                    Your account is linked to Google. Your email and authentication are managed through your Google account.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || email === user?.email}
                  className="px-4 py-2 bg-gray-900 text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                >
                  Update
                </button>
              </form>
            )}
          </div>

          {/* Password Settings - Only show for non-Google accounts */}
          {!isGoogleAccount && (
            <div>
              <h2 className="text-sm font-mono text-gray-600 mb-4">Password</h2>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                    placeholder="Enter new password"
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5 font-mono">Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-gray-400 font-mono text-sm"
                    placeholder="Confirm new password"
                    minLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !newPassword || !confirmPassword}
                  className="px-4 py-2 bg-gray-900 text-white font-mono text-sm hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                >
                  Update
                </button>
              </form>
            </div>
          )}

          {/* Danger Zone */}
          <div className="border-t pt-8 mt-8">
            <h2 className="text-sm font-mono text-red-600 mb-4">Danger Zone</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 font-mono mb-3">
                  Delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 border border-red-600 text-red-600 font-mono text-sm hover:bg-red-50 transition-colors"
                  onClick={() => toast.error('Account deletion not available in development')}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}