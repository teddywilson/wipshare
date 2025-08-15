import { Request, Response } from 'express';
import { prisma } from '../utils/database';
import { NotificationsController } from './notificationsController';

export class UsersController {
  // Send follow request
  static async sendFollowRequest(req: Request, res: Response): Promise<Response | void> {
    try {
      const followerId = req.user!.id;
      const { userId: followingId } = req.params;

      // Can't follow yourself
      if (followerId === followingId) {
        return res.status(400).json({
          error: 'Cannot follow yourself',
          message: 'You cannot follow your own account'
        });
      }

      // Check if target user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: followingId },
        select: { id: true, username: true }
      });

      if (!targetUser) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The user you are trying to follow does not exist'
        });
      }

      // Check if already have a follow relationship
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      if (existingFollow) {
        if (existingFollow.status === 'PENDING') {
          return res.status(400).json({
            error: 'Request already sent',
            message: 'You have already sent a follow request to this user'
          });
        } else if (existingFollow.status === 'APPROVED') {
          return res.status(400).json({
            error: 'Already following',
            message: 'You are already following this user'
          });
        }
        // If rejected, we can resend the request
      }

      // Create or update follow request
      const followRequest = await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        },
        update: {
          status: 'PENDING',
          requestedAt: new Date(),
          respondedAt: null
        },
        create: {
          followerId,
          followingId,
          status: 'PENDING'
        },
        include: {
          follower: {
            select: { username: true }
          }
        }
      });

      // Create notification for the target user
      try {
        await NotificationsController.createNotification(
          followingId,
          'FOLLOW_REQUEST',
          'New follow request',
          `@${followRequest.follower.username} wants to follow you`,
          { followRequestId: followRequest.id, fromUserId: followerId },
          '/follow-requests'
        );
      } catch (error) {
        console.error('Failed to create follow request notification:', error);
      }

      res.json({
        message: `Follow request sent to @${targetUser.username}`,
        status: 'PENDING',
        requestId: followRequest.id
      });
    } catch (error) {
      throw error;
    }
  }

  // Cancel follow request or unfollow user
  static async unfollowUser(req: Request, res: Response): Promise<Response | void> {
    try {
      const followerId = req.user!.id;
      const { userId: followingId } = req.params;

      // Check if follow relationship exists
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      if (!existingFollow) {
        return res.status(400).json({
          error: 'No relationship found',
          message: 'You have no follow relationship with this user'
        });
      }

      // Remove follow relationship or request
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      });

      const message = existingFollow.status === 'PENDING' 
        ? 'Follow request cancelled'
        : 'Successfully unfollowed user';

      res.json({
        message,
        following: false
      });
    } catch (error) {
      throw error;
    }
  }

  // Approve or reject follow request
  static async respondToFollowRequest(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id; // The user being followed
      const { requestId } = req.params;
      const { action } = req.body; // 'approve' or 'reject'

      if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be either "approve" or "reject"'
        });
      }

      // Find the follow request
      const followRequest = await prisma.follow.findFirst({
        where: {
          id: requestId,
          followingId: userId,
          status: 'PENDING'
        },
        include: {
          follower: {
            select: { username: true }
          }
        }
      });

      if (!followRequest) {
        return res.status(404).json({
          error: 'Request not found',
          message: 'Follow request not found or already processed'
        });
      }

      // Update the follow request status
      const updatedRequest = await prisma.follow.update({
        where: { id: requestId },
        data: {
          status: action === 'approve' ? 'APPROVED' : 'REJECTED',
          respondedAt: new Date()
        }
      });

      // Create notification for the requester
      try {
        const notificationType = action === 'approve' ? 'FOLLOW_APPROVED' : 'FOLLOW_REJECTED';
        const notificationMessage = action === 'approve' 
          ? `Your follow request was approved`
          : `Your follow request was declined`;

        await NotificationsController.createNotification(
          followRequest.followerId,
          notificationType,
          `Follow request ${action}d`,
          notificationMessage,
          { followRequestId: requestId, targetUserId: userId },
          action === 'approve' ? `/users/${userId}` : undefined
        );
      } catch (error) {
        console.error('Failed to create follow response notification:', error);
      }

      const message = action === 'approve' 
        ? `Approved follow request from @${followRequest.follower.username}`
        : `Rejected follow request from @${followRequest.follower.username}`;

      res.json({
        message,
        status: updatedRequest.status
      });
    } catch (error) {
      throw error;
    }
  }

  // Get pending follow requests for current user
  static async getPendingFollowRequests(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const requests = await prisma.follow.findMany({
        where: {
          followingId: userId,
          status: 'PENDING'
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              verified: true
            }
          }
        },
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit
      });

      const total = await prisma.follow.count({
        where: {
          followingId: userId,
          status: 'PENDING'
        }
      });

      res.json({
        requests: requests.map(req => ({
          id: req.id,
          user: req.follower,
          requestedAt: req.requestedAt
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get user's followers
  static async getUserFollowers(req: Request, res: Response): Promise<Response | void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const followers = await prisma.follow.findMany({
        where: { 
          followingId: userId,
          status: 'APPROVED'
        },
        include: {
          follower: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              verified: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.follow.count({
        where: { 
          followingId: userId,
          status: 'APPROVED'
        }
      });

      res.json({
        followers: followers.map(f => f.follower),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get user's following
  static async getUserFollowing(req: Request, res: Response): Promise<Response | void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      const following = await prisma.follow.findMany({
        where: { 
          followerId: userId,
          status: 'APPROVED'
        },
        include: {
          following: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              verified: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.follow.count({
        where: { 
          followerId: userId,
          status: 'APPROVED'
        }
      });

      res.json({
        following: following.map(f => f.following),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      throw error;
    }
  }
  static async getProfile(req: Request, res: Response): Promise<Response | void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          location: true,
          verified: true,
          createdAt: true,
          _count: {
            select: {
              tracks: true,
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'The requested user profile could not be found'
        });
      }

      // Count approved followers and following separately
      const [followersCount, followingCount] = await Promise.all([
        prisma.follow.count({
          where: {
            followingId: id,
            status: 'APPROVED'
          }
        }),
        prisma.follow.count({
          where: {
            followerId: id,
            status: 'APPROVED'
          }
        })
      ]);

      // Check follow relationship status
      let followStatus = null;
      if (currentUserId && currentUserId !== id) {
        const followRelation = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: id
            }
          }
        });
        followStatus = followRelation?.status || null;
      }

      res.json({
        user: {
          ...user,
          stats: {
            tracks: user._count.tracks,
            followers: followersCount,
            following: followingCount
          },
          followStatus,
          isFollowing: followStatus === 'APPROVED'
        }
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<Response | void> {
    try {
      const userId = req.user!.id;
      const { username, displayName, bio, location } = req.body;

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          username,
          displayName,
          bio,
          location,
        },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          location: true,
          verified: true,
          createdAt: true,
        }
      });

      res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      throw error;
    }
  }
}