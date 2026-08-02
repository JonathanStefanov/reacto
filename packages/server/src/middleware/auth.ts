/**
 * @reacto/server — JWT Authentication middleware
 *
 * Usage:
 *   app.use(authMiddleware({ secret: 'my-secret' }));
 *   app.use('/admin', requireAuth());
 *   app.use('/api', optionalAuth());
 */
import { Request, Response, NextFunction } from 'express';

export interface AuthConfig {
  /** JWT secret key */
  secret: string;
  /** Token extraction method. Default: 'header' */
  tokenFrom?: 'header' | 'cookie' | 'query';
  /** Cookie name when tokenFrom is 'cookie'. Default: 'token' */
  cookieName?: string;
  /** Header name when tokenFrom is 'header'. Default: 'Authorization' */
  headerName?: string;
  /** Query param name when tokenFrom is 'query'. Default: 'token' */
  queryParam?: string;
}

export interface JwtPayload {
  sub: string | number;
  iat?: number;
  exp?: number;
  [key: string]: unknown;
}

// ─── Simple JWT implementation (no external deps) ────────────────────────────

function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf-8');
}

function hmacSha256(data: string, secret: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sign a JWT token.
 */
export function signJwt(payload: JwtPayload, secret: string, expiresIn: number = 3600): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = hmacSha256(`${headerEncoded}.${payloadEncoded}`, secret);

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify and decode a JWT token.
 */
export function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }

  const [headerEncoded, payloadEncoded, signature] = parts;
  const expectedSignature = hmacSha256(`${headerEncoded}.${payloadEncoded}`, secret);

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature');
  }

  const payload: JwtPayload = JSON.parse(base64UrlDecode(payloadEncoded));

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

// ─── Express Middleware ───────────────────────────────────────────────────────

// Extend Express Request type
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Extract token from request.
 */
function extractToken(req: Request, config: AuthConfig): string | null {
  const tokenFrom = config.tokenFrom ?? 'header';

  switch (tokenFrom) {
    case 'header': {
      const headerName = config.headerName ?? 'Authorization';
      const authHeader = req.headers[headerName.toLowerCase()];
      if (!authHeader || typeof authHeader !== 'string') return null;
      if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
      return authHeader;
    }
    case 'cookie': {
      const cookieName = config.cookieName ?? 'token';
      return (req.cookies?.[cookieName] as string) ?? null;
    }
    case 'query': {
      const queryParam = config.queryParam ?? 'token';
      const val = req.query[queryParam];
      return typeof val === 'string' ? val : null;
    }
    default:
      return null;
  }
}

/**
 * Auth middleware — attaches user to request if token is present.
 * Does NOT reject unauthenticated requests (use requireAuth for that).
 */
export function authMiddleware(config: AuthConfig) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const token = extractToken(req, config);
    if (token) {
      try {
        req.user = verifyJwt(token, config.secret);
      } catch {
        // Invalid token — user stays undefined
      }
    }
    next();
  };
}

/**
 * Require authentication — returns 401 if no valid token.
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    next();
  };
}

/**
 * Optional authentication — proceeds regardless, but attaches user if present.
 * This is the same as authMiddleware behavior, provided for explicitness.
 */
export function optionalAuth() {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    next();
  };
}

/**
 * Require specific user properties.
 */
export function requireProperty(property: string, value?: unknown) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (value !== undefined) {
      if (req.user[property] !== value) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    } else {
      if (!(property in req.user)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    next();
  };
}
