import { Request, Response, NextFunction } from 'express'
import { auth } from '../lib/firebase-admin'
import { prisma } from '../utils/database'

// Extend Express Request type to include Firebase user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        username?: string
        displayName?: string
        firebaseUid: string
      }
    }
  }
}

export const authenticateFirebase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization
    
    console.log('🔐 [AUTH] Starting authentication:', {
      path: req.path,
      hasAuthHeader: !!authHeader,
      authHeaderStart: authHeader?.substring(0, 20),
      projectId: process.env.FIREBASE_PROJECT_ID,
      dbUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
      timestamp: new Date().toISOString()
    })
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      })
    }

    const idToken = authHeader.substring(7)
    
    // Verify the Firebase ID token
    let decodedToken
    try {
      console.log('🔑 [AUTH] Verifying token...')
      decodedToken = await auth.verifyIdToken(idToken)
      console.log('✅ [AUTH] Token verified successfully:', {
        uid: decodedToken.uid,
        email: decodedToken.email
      })
    } catch (verifyError: any) {
      console.error('❌ [AUTH] Token verification failed:', {
        error: verifyError.message,
        code: verifyError.code,
        projectId: process.env.FIREBASE_PROJECT_ID,
        tokenLength: idToken?.length
      })
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication token is invalid or expired',
        details: verifyError.code
      })
    }
    
    const { uid, email, name } = decodedToken

    if (!email) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token must contain email'
      })
    }

    // Find or create user in our database
    console.log('🔍 [AUTH] Looking up user in database:', { firebaseUid: uid })
    let user
    try {
      user = await prisma.user.findUnique({
        where: { firebaseUid: uid },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          firebaseUid: true,
        }
      })
      console.log('📊 [AUTH] Database query result:', { userFound: !!user, userId: user?.id })
    } catch (dbError: any) {
      console.error('❌ [AUTH] Database query failed:', {
        error: dbError.message,
        code: dbError.code,
        clientVersion: dbError.clientVersion
      })
      throw dbError
    }

    // If user doesn't exist, check if user exists with this email but different Firebase UID
    if (!user) {
      console.log('🆕 [AUTH] User not found by Firebase UID, checking by email:', { email, uid })
      
      // Check if user exists with this email
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          firebaseUid: true,
        }
      })
      
      if (existingUserByEmail) {
        console.log('🔄 [AUTH] Updating existing user with new Firebase UID:', { 
          userId: existingUserByEmail.id, 
          oldUid: existingUserByEmail.firebaseUid, 
          newUid: uid 
        })
        
        // Update the existing user with the new Firebase UID
        user = await prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: { firebaseUid: uid },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            firebaseUid: true,
          }
        })
        console.log('✅ [AUTH] User Firebase UID updated successfully:', { userId: user.id })
      } else {
        // Create new user if doesn't exist at all
        console.log('🆕 [AUTH] Creating new user:', { email, uid })
        try {
          // Generate a temporary username from email + uid (will be updated by user later)
          const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_')
          const uidSuffix = uid.substring(0, 4)
          const tempUsername = `${baseUsername}_${uidSuffix}`.substring(0, 20)
          
          user = await prisma.user.create({
            data: {
              firebaseUid: uid,
              email,
              displayName: name || email.split('@')[0],
              username: tempUsername, // Temporary username - user should update this
              password: '', // Not used with Firebase Auth
            },
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              firebaseUid: true,
            }
          })
          console.log('✅ [AUTH] User created successfully:', { userId: user.id, tempUsername })
          
          // Create personal workspace for new user
          try {
            const workspace = await prisma.workspace.create({
              data: {
                name: 'Personal',
                slug: `${tempUsername}-personal`,
                ownerId: user.id,
                personalUserId: user.id,
                isPersonal: true,
                billingTier: 'free',
                members: {
                  create: {
                    userId: user.id,
                    role: 'OWNER'
                  }
                },
                usage: {
                  create: {
                    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
                  }
                }
              }
            })
            
            // Set as default workspace
            await prisma.user.update({
              where: { id: user.id },
              data: { defaultWorkspaceId: workspace.id }
            })
            
            console.log('✅ [AUTH] Personal workspace created:', { workspaceId: workspace.id })
          } catch (wsError) {
            console.error('⚠️ [AUTH] Failed to create personal workspace:', wsError)
            // Non-critical error - user can still continue
          }
        } catch (createError: any) {
          console.error('❌ [AUTH] Failed to create user:', {
            error: createError.message,
            code: createError.code
          })
          throw createError
        }
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username || undefined,
      displayName: user.displayName || undefined,
      firebaseUid: user.firebaseUid,
    }

    console.log('✅ [AUTH] Authentication successful:', {
      userId: user.id,
      email: user.email,
      path: req.path
    })

    next()
  } catch (error: any) {
    console.error('❌ [AUTH] Authentication error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      path: req.path
    })
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: error.message || 'Please sign in again',
      details: process.env.NODE_ENV === 'staging' ? error.message : undefined
    })
  }
}

export const optionalFirebaseAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7)
      const decodedToken = await auth.verifyIdToken(idToken)
      const { uid, email } = decodedToken

      if (email) {
        const user = await prisma.user.findUnique({
          where: { firebaseUid: uid },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            firebaseUid: true,
          }
        })

        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username || undefined,
            displayName: user.displayName || undefined,
            firebaseUid: user.firebaseUid,
          }
        }
      }
    }
    
    next()
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next()
  }
}