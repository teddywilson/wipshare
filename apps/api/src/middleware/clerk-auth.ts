import { clerkMiddleware, getAuth, requireAuth as clerkRequireAuth } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { getUserFromClerkAuth } from '../utils/auth-helpers';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    orgId?: string | null;
  };
}

// Attach Clerk auth context globally in index.ts via this export
export const attachClerk = clerkMiddleware();

// Require authentication and populate req.user from DB
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const base = clerkRequireAuth();
  return base(req as any, res, async () => {
    try {
      const user = await getUserFromClerkAuth(req as AuthRequest);
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  });
};

// Optionally attach req.user if signed in
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req as any);
    if (!auth?.userId) return next();
    const user = await getUserFromClerkAuth(req as AuthRequest);
    req.user = user || undefined;
  } catch {
    // ignore
  }
  return next();
};