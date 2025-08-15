import { prisma } from './database';
import { AuthRequest } from '../middleware/clerk-auth';

/**
 * Get or create a user from Clerk authentication
 */
export async function getUserFromClerkAuth(req: AuthRequest) {
  const clerkUserId = req.auth?.userId;
  
  if (!clerkUserId) {
    return null;
  }

  // Try to find existing user
  let user = await prisma.user.findUnique({
    where: { clerkUserId: clerkUserId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      clerkUserId: true,
    }
  });

  // Convert null displayName to undefined for compatibility
  if (user) {
    return {
      ...user,
      displayName: user.displayName || undefined
    };
  }

  // If user doesn't exist, create a temporary one
  // The user will need to complete profile setup
  const tempUsername = `user_${clerkUserId.substring(0, 8)}`;
  const newUser = await prisma.user.create({
    data: {
      clerkUserId: clerkUserId,
      email: `${clerkUserId}@clerk.user`,
      username: tempUsername,
      displayName: 'New User',
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      clerkUserId: true,
    }
  });

  return {
    ...newUser,
    displayName: newUser.displayName || undefined
  };
}

/**
 * Require user to be authenticated and have a complete profile
 */
export async function requireUserProfile(req: AuthRequest) {
  const user = await getUserFromClerkAuth(req);
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if user has completed profile setup
  if (user.username.startsWith('user_') && user.email.endsWith('@clerk.user')) {
    throw new Error('Profile setup not complete');
  }

  return user;
}