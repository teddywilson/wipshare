import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateFirebase } from '../middleware/firebase-auth';

export const authRouter = Router();

// Search users (protected)
authRouter.get('/search', authenticateFirebase, AuthController.searchUsers);

// Create or update user profile (protected)
authRouter.post('/profile', authenticateFirebase, AuthController.createProfile);

// Get current user info (protected)
// Note: Registration and login are handled by Firebase Auth client-side
authRouter.get('/me', authenticateFirebase, AuthController.me);