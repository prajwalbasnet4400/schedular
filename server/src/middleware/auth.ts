/**
 * Authentication and role-based access control.
 *
 * FR6: "The system shall support user authentication with role-based access control,
 * distinguishing between administrators (who can modify data and run the algorithm) and
 * viewers (who can only view and export schedules)."
 *
 * The check lives in Express middleware, not in the React app. A frontend that merely
 * hides the delete button is not access control -- anyone can issue the DELETE with curl.
 * The client hides controls for usability; this file is what actually enforces the rule.
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUser, UserRole } from '@schedular/shared';

const JWT_SECRET = process.env.JWT_SECRET ?? 'cacs452-schedular-dev-secret';
const TOKEN_TTL = '8h';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}

/** Rejects the request unless it carries a valid bearer token. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // The SSE progress stream is opened by EventSource, which cannot set an Authorization
  // header, so a token query parameter is accepted for GET requests only.
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : req.method === 'GET' && typeof req.query.token === 'string'
      ? req.query.token
      : undefined;

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

/** Rejects the request unless the authenticated user holds one of the given roles. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `This action requires the ${roles.join(' or ')} role. You are signed in as ${req.user.role}.`,
      });
      return;
    }
    next();
  };
}
