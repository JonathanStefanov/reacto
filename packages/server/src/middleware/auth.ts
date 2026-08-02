/**
 * @reacto/server — Authentication middleware (JWT)
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthOptions {
  secret: string;
  excludePaths?: string[];
  excludeMethods?: string[];
}

export interface JwtPayload {
  userId: number;
  email: string;
  isStaff?: boolean;
  isAdmin?: boolean;
  [key: string]: unknown;
}

// Extend Express Request
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 */
export function authMiddleware(options: AuthOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip excluded paths
    if (options.excludePaths?.some((p) => req.path.startsWith(p))) {
      return next();
    }

    // Skip excluded methods
    if (options.excludeMethods?.includes(req.method)) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: { message: 'Missing or invalid token', code: 'UNAUTHORIZED' } });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = jwt.verify(token, options.secret) as JwtPayload;
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' } });
    }
  };
}

/**
 * Generate a JWT token.
 */
export function generateToken(payload: JwtPayload, secret: string, expiresIn: string = '7d'): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, secret, { expiresIn } as any);
}

/**
 * Require authenticated user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
    return;
  }
  next();
}

/**
 * Require staff user.
 */
export function requireStaff(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isStaff) {
    res.status(403).json({ error: { message: 'Staff access required', code: 'FORBIDDEN' } });
    return;
  }
  next();
}

/**
 * Require admin user.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.isAdmin) {
    res.status(403).json({ error: { message: 'Admin access required', code: 'FORBIDDEN' } });
    return;
  }
  next();
}
