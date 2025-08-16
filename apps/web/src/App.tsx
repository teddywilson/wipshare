import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider, useAuth } from './lib/stytch-auth-context'
import { DataProvider } from './contexts/DataContext'
import { WorkspaceProvider } from './contexts/WorkspaceContext'
import { useState } from 'react'

// Layout
import AppLayout from './components/AppLayout'
import AuthenticatedLayout from './components/AuthenticatedLayout'

// Components
import ConnectionStatus from './components/ConnectionStatus'
import AppLoadingScreen from './components/AppLoadingScreen'
import UsernameSetup from './components/UsernameSetup'

// Pages
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Track from './pages/Track'
import ProfileSettings from './pages/ProfileSettings'
import Library from './pages/Library'
import Projects from './pages/Projects'
import Project from './pages/Project'
import ProjectSettings from './pages/ProjectSettings'
import Playlists from './pages/Playlists'
import Playlist from './pages/Playlist'
import UserProfile from './pages/UserProfile'
import FollowRequests from './pages/FollowRequests'
import AcceptProjectInvite from './pages/AcceptProjectInvite'
import SSOCallback from './pages/SSOCallback'
import Onboarding from './pages/Onboarding'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // Data is fresh for 30 seconds
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false, // Don't refetch on window focus by default
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
})

function AppRoutes() {
  const { user, userProfile, isLoading: loading, needsUsernameSetup, refreshProfile } = useAuth()
  const [showUsernameSetup, setShowUsernameSetup] = useState(false)

  // Show username setup modal for users with temporary usernames
  const shouldShowUsernameSetup = user && needsUsernameSetup && !showUsernameSetup

  // Always render app shell; internal overlays handle loading to avoid double spinners

  const handleUsernameSetupComplete = async () => {
    setShowUsernameSetup(false)
    await refreshProfile()
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes with search modal */}
        <Route element={<AppLayout />}>
          <Route path="/" element={loading ? <AppLoadingScreen /> : user ? <Navigate to="/dashboard" /> : <Landing />} />
          <Route path="/login" element={loading ? <AppLoadingScreen /> : user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/sso-callback" element={<SSOCallback />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/invite/project/:token" element={<AcceptProjectInvite />} />
        </Route>
        
        {/* Authenticated routes with header. Keep layout even in onboarding (overlays will show) */}
        <Route element={loading ? <AppLoadingScreen /> : user ? <AuthenticatedLayout /> : <Navigate to="/login" />}> 
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<Project />} />
          <Route path="/projects/:id/settings" element={<ProjectSettings />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlists/mine" element={<Playlists />} />
          <Route path="/playlists/discover" element={<Playlists />} />
          <Route path="/playlist/:id" element={<Playlist />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/track/:id" element={<Track />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/follow-requests" element={<FollowRequests />} />
          <Route path="/settings" element={<ProfileSettings />} />
        </Route>
      </Routes>
      <ConnectionStatus />
      
      {/* Username setup modal for new Google users */}
      {shouldShowUsernameSetup && userProfile && (
        <UsernameSetup
          initialUsername={userProfile.username}
          onComplete={handleUsernameSetupComplete}
        />
      )}
    </BrowserRouter>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <DataProvider>
            <AppRoutes />
          </DataProvider>
        </WorkspaceProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App