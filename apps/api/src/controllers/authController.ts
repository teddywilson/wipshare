import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { AuthRequest } from '../middleware/clerk-auth';

export class AuthController {
  // Return auth status and whether onboarding is required
  static async status(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const clerkUserId = req.auth!.userId;
      const user = await prisma.user.findUnique({
        where: { clerkUserId },
        select: { id: true, username: true }
      });

      if (!user) {
        return res.json({ isAuthenticated: true, hasProfile: false, needsOnboarding: true });
      }

      const needsOnboarding = !user.username;
      return res.json({ isAuthenticated: true, hasProfile: true, needsOnboarding });
    } catch (error) {
      throw error;
    }
  }
  // Search users by username or display name
  static async searchUsers(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { q: query, limit = 10 } = req.query;
      const clerkUserId = req.auth?.userId;
      
      // Get current user from database using Clerk ID
      const currentUser = clerkUserId ? await prisma.user.findUnique({
        where: { clerkUserId: clerkUserId },
        select: { id: true }
      }) : null;
      
      const currentUserId = currentUser?.id;

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.json({ users: [] });
      }

      const searchTerm = query.trim().toLowerCase();
      
      const users = await prisma.user.findMany({
        where: {
          AND: [
            // Exclude current user from results
            currentUserId ? { id: { not: currentUserId } } : {},
            {
              OR: [
                { username: { contains: searchTerm, mode: 'insensitive' } },
                { displayName: { contains: searchTerm, mode: 'insensitive' } },
              ]
            }
          ]
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          verified: true,
          _count: {
            select: {
              tracks: true,
              followers: true,
              following: true,
            }
          }
        },
        take: Math.min(parseInt(limit as string) || 10, 50),
        orderBy: [
          // Prioritize exact username matches
          { username: 'asc' },
          { displayName: 'asc' }
        ]
      });

      res.json({
        users: users.map(user => ({
          ...user,
          stats: user._count
        }))
      });
    } catch (error) {
      throw error;
    }
  }
  // Create or update user profile (after Clerk registration)
  static async createProfile(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const { username, displayName, email } = req.body;
      const clerkUserId = req.auth!.userId;

      // Validate required fields
      if (!username) {
        return res.status(400).json({
          error: 'Username is required',
          message: 'Please provide a username'
        });
      }

      // Validate username format
      if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({
          error: 'Invalid username format',
          message: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only'
        });
      }

      // Check if username is already taken
      const existingUser = await prisma.user.findUnique({
        where: { username },
        select: { id: true }
      });

      // Check if user already exists with this Clerk ID
      const existingUserByClerk = await prisma.user.findUnique({
        where: { clerkUserId: clerkUserId },
        select: { id: true }
      });

      if (existingUser && (!existingUserByClerk || existingUser.id !== existingUserByClerk.id)) {
        return res.status(400).json({
          error: 'Username already taken',
          message: 'Please choose a different username'
        });
      }

      // Create or update the user
      const userData = {
        username,
        displayName: displayName || (email ? email.split('@')[0] : username),
        email: email || `${clerkUserId}@clerk.user`, // Fallback email if not provided
      };

      const user = existingUserByClerk 
        ? await prisma.user.update({
            where: { clerkUserId: clerkUserId },
            data: userData,
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              bio: true,
              avatarUrl: true,
              verified: true,
              createdAt: true,
              clerkUserId: true,
            }
          })
        : await prisma.user.create({
            data: {
              ...userData,
              clerkUserId: clerkUserId,
            },
            select: {
              id: true,
              email: true,
              username: true,
              displayName: true,
              bio: true,
              avatarUrl: true,
              verified: true,
              createdAt: true,
              clerkUserId: true,
            }
          });

      res.json({
        user: user,
        message: 'Profile created successfully'
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          error: 'Username already taken',
          message: 'Please choose a different username'
        });
      }
      throw error;
    }
  }

  // Get current user info - user is already verified by Clerk middleware
  static async me(req: AuthRequest, res: Response): Promise<Response | void> {
    try {
      const clerkUserId = req.auth!.userId;

      const user = await prisma.user.findUnique({
        where: { clerkUserId: clerkUserId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          verified: true,
          createdAt: true,
          clerkUserId: true,
          _count: {
            select: {
              tracks: true,
              followers: true,
              following: true,
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'Your account could not be found'
        });
      }

      res.json({
        user: {
          ...user,
          stats: user._count
        }
      });
    } catch (error) {
      throw error;
    }
  }
}