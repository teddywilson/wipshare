import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth, requireClerkAuth } from '../middleware/clerk-auth';

export const authRouter = Router();

// Search users (protected)
authRouter.get('/search', requireAuth, AuthController.searchUsers);

// Create or update user profile (requires Clerk session; DB user may not exist yet)
authRouter.post('/profile', requireClerkAuth, AuthController.createProfile);

// Get current user info (protected)
// Note: Registration and login are handled by Clerk client-side
authRouter.get('/me', requireAuth, AuthController.me);

// Auth status for onboarding (requires Clerk session only)
authRouter.get('/status', requireClerkAuth, AuthController.status);

// Complete onboarding (requires Clerk session)
authRouter.post('/onboard', requireClerkAuth, AuthController.onboard);