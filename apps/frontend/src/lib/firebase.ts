import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Firebase config - use staging for local development
const isProduction = import.meta.env.VITE_ENV === 'production'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

console.log('Firebase config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  env: import.meta.env.VITE_ENV
})

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Auth
export const auth = getAuth(app)

// Configure auth settings for localhost
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // Disable app verification for testing
  auth.settings.appVerificationDisabledForTesting = true
  
  // Set the auth domain explicitly to staging for local development
  auth.tenantId = null // Ensure we're not using multi-tenancy
}

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider()

// Configure Google Auth Provider with explicit parameters
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

// Add required scopes
googleProvider.addScope('profile')
googleProvider.addScope('email')

// Log the auth settings
console.log('Auth settings:', {
  currentUser: auth.currentUser,
  settings: auth.settings,
  authDomain: firebaseConfig.authDomain,
  redirectUrl: window.location.origin + '/__/auth/handler',
  actualOrigin: window.location.origin,
  hostname: window.location.hostname,
  protocol: window.location.protocol
})

export default app