import { useState } from 'react'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth'
import { ManualGoogleOAuth } from '../lib/google-oauth'

export default function OAuthDebug() {
  const [logs, setLogs] = useState<string[]>([])
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
    console.log(message)
  }
  
  const testPopupAuth = async () => {
    try {
      addLog('Starting popup auth...')
      addLog(`Current URL: ${window.location.href}`)
      addLog(`Expected redirect URI: ${window.location.origin}/__/auth/handler`)
      
      const result = await signInWithPopup(auth, googleProvider)
      addLog(`Success! User: ${result.user.email}`)
    } catch (error: any) {
      addLog(`Error: ${error.code} - ${error.message}`)
      if (error.customData) {
        addLog(`Custom data: ${JSON.stringify(error.customData)}`)
      }
    }
  }
  
  const testRedirectAuth = async () => {
    try {
      addLog('Starting redirect auth...')
      addLog(`Current URL: ${window.location.href}`)
      addLog(`Expected redirect URI: ${window.location.origin}/__/auth/handler`)
      
      await signInWithRedirect(auth, googleProvider)
      addLog('Redirecting to Google...')
    } catch (error: any) {
      addLog(`Error: ${error.code} - ${error.message}`)
      if (error.customData) {
        addLog(`Custom data: ${JSON.stringify(error.customData)}`)
      }
    }
  }
  
  const testManualAuth = () => {
    addLog('Starting manual OAuth...')
    const manualOAuth = new ManualGoogleOAuth('wipshare-stg')
    const authUrl = (manualOAuth as any).getAuthUrl()
    addLog(`OAuth URL: ${authUrl}`)
    
    // Parse and log the parameters
    const url = new URL(authUrl)
    const params = Object.fromEntries(url.searchParams.entries())
    addLog(`OAuth params: ${JSON.stringify(params, null, 2)}`)
    
    if (confirm('Open OAuth URL in new window for testing?')) {
      window.open(authUrl, '_blank')
    }
  }
  
  const checkRedirectResult = async () => {
    try {
      addLog('Checking for redirect result...')
      const result = await getRedirectResult(auth)
      if (result) {
        addLog(`Found redirect result! User: ${result.user?.email}`)
      } else {
        addLog('No redirect result found')
      }
    } catch (error: any) {
      addLog(`Redirect result error: ${error.code} - ${error.message}`)
    }
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OAuth Debug Tool</h1>
        
        <div className="mb-8 p-4 bg-zinc-900 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          <pre className="text-sm text-zinc-400">
{JSON.stringify({
  projectId: auth.config.projectId,
  authDomain: auth.config.authDomain,
  currentOrigin: window.location.origin,
  expectedRedirectUri: `${window.location.origin}/__/auth/handler`,
  hostname: window.location.hostname,
  protocol: window.location.protocol
}, null, 2)}
          </pre>
        </div>
        
        <div className="space-y-4 mb-8">
          <button
            onClick={testPopupAuth}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
          >
            Test Popup Auth
          </button>
          
          <button
            onClick={testRedirectAuth}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium ml-4"
          >
            Test Redirect Auth
          </button>
          
          <button
            onClick={testManualAuth}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium ml-4"
          >
            Test Manual OAuth
          </button>
          
          <button
            onClick={checkRedirectResult}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium ml-4"
          >
            Check Redirect Result
          </button>
          
          <button
            onClick={() => setLogs([])}
            className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium ml-4"
          >
            Clear Logs
          </button>
        </div>
        
        <div className="bg-zinc-900 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Logs</h2>
          <div className="space-y-1 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-zinc-500">No logs yet. Click a button to test OAuth.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-zinc-300">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}