import { signInWithCredential, GoogleAuthProvider, type Auth } from 'firebase/auth'

// Manual Google OAuth implementation as a fallback
export class ManualGoogleOAuth {
  private clientId: string
  private redirectUri: string
  
  constructor(projectId: string) {
    // Use the correct OAuth client ID for the staging project
    this.clientId = projectId === 'wipshare-stg' 
      ? '1014313250623-6hq9p3ptn9d9rqhddg7mg8lnr18dqsle.apps.googleusercontent.com'
      : '641088966171-YOUR_PROD_CLIENT_ID.apps.googleusercontent.com' // Update with prod client ID
    
    // Construct the correct redirect URI
    this.redirectUri = `${window.location.origin}/__/auth/handler`
  }
  
  // Generate the OAuth URL manually
  getAuthUrl(): string {
    const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      prompt: 'select_account',
      // Include a state parameter for security
      state: this.generateState(),
      // Required for implicit flow
      nonce: this.generateNonce()
    })
    
    return `${baseUrl}?${params.toString()}`
  }
  
  // Initiate manual OAuth flow
  async signIn(): Promise<void> {
    const authUrl = this.getAuthUrl()
    console.log('Manual OAuth URL:', authUrl)
    console.log('Redirect URI:', this.redirectUri)
    
    // Store state for verification
    const state = this.getStateFromUrl(authUrl)
    if (state) {
      sessionStorage.setItem('oauth_state', state)
    }
    
    // Redirect to Google OAuth
    window.location.href = authUrl
  }
  
  // Handle the OAuth callback
  async handleCallback(auth: Auth): Promise<any> {
    const hash = window.location.hash
    if (!hash) return null
    
    // Parse the hash fragment
    const params = new URLSearchParams(hash.substring(1))
    const idToken = params.get('id_token')
    const state = params.get('state')
    
    // Verify state
    const savedState = sessionStorage.getItem('oauth_state')
    if (state !== savedState) {
      throw new Error('Invalid OAuth state')
    }
    
    // Clear state
    sessionStorage.removeItem('oauth_state')
    
    if (!idToken) {
      throw new Error('No ID token received')
    }
    
    // Create credential and sign in
    const credential = GoogleAuthProvider.credential(idToken)
    return signInWithCredential(auth, credential)
  }
  
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15)
  }
  
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15)
  }
  
  private getStateFromUrl(url: string): string | null {
    const urlObj = new URL(url)
    return urlObj.searchParams.get('state')
  }
}

// Export a function to check if we're on the OAuth callback page
export function isOAuthCallback(): boolean {
  return window.location.pathname === '/__/auth/handler' || 
         window.location.hash.includes('id_token')
}

// Export a function to get the correct redirect URI for the current environment
export function getRedirectUri(): string {
  return `${window.location.origin}/__/auth/handler`
}