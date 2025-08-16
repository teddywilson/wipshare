import { Request, Response, NextFunction } from 'express';
import { getUserFromClerkAuth } from '../utils/auth-helpers';
import { Client, envs } from 'stytch';

export interface AuthRequest extends Request {
  auth?: {
    userId: string;
    sessionId: string;
    orgId?: string | null;
  };
}

// Stytch client
export const stytch = new Client({
  project_id: process.env.STYTCH_PROJECT_ID || '',
  secret: process.env.STYTCH_SECRET || '',
  env: process.env.STYTCH_ENV === 'live' ? envs.live : envs.test,
});

// Attach auth from Stytch session JWT
export const attachClerk = async (req: Request, _res: Response, next: NextFunction) => {
  const authz = req.headers.authorization;
  if (!authz) return next();
  const token = authz.replace(/^Bearer\s+/i, '').trim();
  try {
    const { session } = await stytch.sessions.authenticateJwt({ session_jwt: token });
    (req as any).auth = { userId: session.user_id, sessionId: session.session_id };
  } catch {
    // ignore; downstream middlewares will enforce auth when required
  }
  return next();
};

// Require a valid Stytch session but do NOT require an existing DB profile.
// Used for onboarding/status endpoints that must work before the user record exists.
export const requireStytchSession = (req: Request, res: Response, next: NextFunction) => {
  return (async () => {
    try {
      const authz = req.headers.authorization;
      if (!authz) return res.status(401).json({ error: 'Unauthorized' });
      const token = authz.replace(/^Bearer\s+/i, '').trim();
      const { session } = await stytch.sessions.authenticateJwt({ session_jwt: token });
      (req as any).auth = { userId: session.user_id, sessionId: session.session_id };
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  })();
};

// Require authentication and populate req.user from DB
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  return (async () => {
    try {
      const authz = req.headers.authorization;
      if (!authz) return res.status(401).json({ error: 'Unauthorized' });
      const token = authz.replace(/^Bearer\s+/i, '').trim();
      const { session } = await stytch.sessions.authenticateJwt({ session_jwt: token });
      (req as any).auth = { userId: session.user_id, sessionId: session.session_id };
      const user = await getUserFromClerkAuth(req as AuthRequest);
      if (!user) {
        return res.status(428).json({ error: 'Profile setup required', code: 'PROFILE_INCOMPLETE' });
      }
      req.user = user;
      return next();
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  })();
};

// Optionally attach req.user if signed in
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authz = req.headers.authorization;
    if (!authz) return next();
    const token = authz.replace(/^Bearer\s+/i, '').trim();
    const { session } = await stytch.sessions.authenticateJwt({ session_jwt: token });
    (req as any).auth = { userId: session.user_id, sessionId: session.session_id };
    const user = await getUserFromClerkAuth(req as AuthRequest);
    req.user = user || undefined;
  } catch {
    // ignore
  }
  return next();
};