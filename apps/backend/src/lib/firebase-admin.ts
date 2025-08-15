import admin from 'firebase-admin'

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'wipshare-prod-1754907075'
  
  try {
    // For Cloud Run and other Google Cloud environments
    // The service account is automatically provided via metadata service
    // We need to initialize with full config for proper token verification
    admin.initializeApp({
      projectId,
      credential: admin.credential.applicationDefault(),
      // These additional fields help with token verification
      serviceAccountId: `wipshare-backend@${projectId}.iam.gserviceaccount.com`,
      databaseURL: `https://${projectId}.firebaseio.com`,
    })
    
    console.log(`Firebase Admin SDK initialized for project: ${projectId}`)
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error)
    
    // Fallback: Initialize with minimal config
    // This ensures the SDK can still verify tokens using public keys
    admin.initializeApp({
      projectId,
      credential: admin.credential.applicationDefault(),
    })
    
    console.log(`Firebase Admin SDK initialized (fallback) for project: ${projectId}`)
  }
}

export const auth = admin.auth()
export const firestore = admin.firestore()

export default admin