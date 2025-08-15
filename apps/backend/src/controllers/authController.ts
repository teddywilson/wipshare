import { Request, Response } from 'express';
import { prisma } from '../utils/database';

export class AuthController {
  // Search users by username or display name
  static async searchUsers(req: Request, res: Response): Promise<Response | void> {
    try {
      const { q: query, limit = 10 } = req.query;
      const currentUserId = req.user?.id;

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
  // Create or update user profile (after Firebase registration)
  static async createProfile(req: Request, res: Response): Promise<Response | void> {
    try {
      const { username, displayName } = req.body;
      const firebaseUid = req.user!.firebaseUid;
      const email = req.user!.email;

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

      if (existingUser && existingUser.id !== req.user!.id) {
        return res.status(400).json({
          error: 'Username already taken',
          message: 'Please choose a different username'
        });
      }

      // Update the user with username and displayName
      const updatedUser = await prisma.user.update({
        where: { firebaseUid },
        data: {
          username,
          displayName: displayName || email.split('@')[0]
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
          firebaseUid: true,
        }
      });

      res.json({
        user: updatedUser,
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

  // Get current user info - user is already verified by Firebase middleware
  static async me(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          verified: true,
          createdAt: true,
          firebaseUid: true,
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