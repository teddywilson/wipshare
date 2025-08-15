import { requireAuth as clerkRequireAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';

export const requireAuth = clerkRequireAuth();

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  return requireAuth(req, res, next);
};

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    orgId?: string | null;
  };
}