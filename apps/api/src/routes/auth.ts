import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/clerk-auth';

export const authRouter = Router();

// Search users (protected)
authRouter.get('/search', requireAuth, AuthController.searchUsers);

// Create or update user profile (protected)
authRouter.post('/profile', requireAuth, AuthController.createProfile);

// Get current user info (protected)
// Note: Registration and login are handled by Clerk client-side
authRouter.get('/me', requireAuth, AuthController.me);