import { AuthRequest } from '../middleware/clerk-auth';

// Extend Express Request type to include user from database
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username?: string;
        displayName?: string;
        clerkUserId: string;
      };
    }
  }
}

export {};