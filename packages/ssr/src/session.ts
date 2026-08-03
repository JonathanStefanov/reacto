/**
 * Session Middleware — cookie-based authentication for server-rendered pages.
 *
 * Unlike JWT (used for API routes), sessions use httpOnly cookies
 * which are more secure and work with server rendering.
 */
import type { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes } from 'crypto';

export interface SessionOptions {
  /** Cookie name (default: 'reacto_session') */
  cookieName?: string;
  /** Session secret for signing */
  secret: string;
  /** Max age in seconds (default: 7 days) */
  maxAge?: number;
  /** Cookie domain */
  domain?: string;
  /** Secure cookie (HTTPS only) */
  secure?: boolean;
}

interface SessionData {
  userId: number;
  email: string;
  username: string;
  [key: string]: unknown;
}

// In-memory session store (use Redis in production)
const sessions = new Map<string, { data: SessionData; expiresAt: number }>();

/**
 * Create session middleware.
 */
export function createSessionMiddleware(options: SessionOptions) {
  const {
    cookieName = 'reacto_session',
    secret,
    maxAge = 7 * 24 * 60 * 60, // 7 days
    domain,
    secure = false,
  } = options;

  // Cleanup expired sessions periodically
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions) {
      if (now > session.expiresAt) {
        sessions.delete(id);
      }
    }
  }, 60_000);

  return (req: Request, res: Response, next: NextFunction) => {
    // Read session from cookie
    const sessionId = req.cookies?.[cookieName];

    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session && Date.now() < session.expiresAt) {
        (req as RequestWithSession).session = session.data;
        (req as RequestWithSession).sessionId = sessionId;
      } else {
        // Expired or invalid — clear cookie
        res.clearCookie(cookieName);
        sessions.delete(sessionId);
      }
    }

    // Add session helper methods
    (req as RequestWithSession).login = (user: SessionData) => {
      const id = generateSessionId(secret);
      const expiresAt = Date.now() + maxAge * 1000;

      sessions.set(id, { data: user, expiresAt });

      res.cookie(cookieName, id, {
        httpOnly: true,
        secure,
        domain,
        maxAge: maxAge * 1000,
        sameSite: 'lax',
      });

      (req as RequestWithSession).session = user;
      (req as RequestWithSession).sessionId = id;
    };

    (req as RequestWithSession).logout = () => {
      const sid = (req as RequestWithSession).sessionId;
      if (sid) {
        sessions.delete(sid);
        res.clearCookie(cookieName);
      }
      (req as RequestWithSession).session = undefined;
      (req as RequestWithSession).sessionId = undefined;
    };

    // Make user available in templates
    res.locals.user = (req as RequestWithSession).session || null;

    next();
  };
}

export interface RequestWithSession extends Request {
  session?: SessionData;
  sessionId?: string;
  login: (user: SessionData) => void;
  logout: () => void;
}

function generateSessionId(secret: string): string {
  const random = randomBytes(32).toString('hex');
  const signature = createHash('sha256')
    .update(random + secret)
    .digest('hex')
    .slice(0, 16);
  return `${random}.${signature}`;
}
