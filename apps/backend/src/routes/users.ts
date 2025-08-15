import { Router } from 'express';
import { UsersController } from '../controllers/usersController';
import { authenticateFirebase, optionalFirebaseAuth } from '../middleware/firebase-auth';

export const usersRouter = Router();

// Get user profile by ID (public, but shows follow status if authenticated)
usersRouter.get('/:id', optionalFirebaseAuth, UsersController.getProfile);

// Send follow request (protected)
usersRouter.post('/:userId/follow', authenticateFirebase, UsersController.sendFollowRequest);

// Cancel follow request or unfollow user (protected)
usersRouter.delete('/:userId/follow', authenticateFirebase, UsersController.unfollowUser);

// Get pending follow requests for current user (protected)
usersRouter.get('/me/follow-requests', authenticateFirebase, UsersController.getPendingFollowRequests);

// Respond to follow request (protected)
usersRouter.post('/me/follow-requests/:requestId/respond', authenticateFirebase, UsersController.respondToFollowRequest);

// Get user's followers (public)
usersRouter.get('/:userId/followers', UsersController.getUserFollowers);

// Get user's following (public)
usersRouter.get('/:userId/following', UsersController.getUserFollowing);

// Update current user's profile (protected)
usersRouter.put('/me', authenticateFirebase, UsersController.updateProfile);