/**
 * Reacto Server — JWT Auth Middleware
 *
 * Provides JWT-based authentication:
 *   app.use('/api', authMiddleware);
 *   app.post('/api/login', loginHandler(User));
 */
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: number;
  email?: string;
  [key: string]: unknown;
}

export interface AuthOptions {
  secret?: string;
  expiresIn?: number; // seconds, default 86400 (24h)
}

// ─── JWT Implementation (no external deps) ────────────────────────────────────

function base64url(data: Buffer | string): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str: string): Buffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

/**
 * Sign a JWT token.
 */
export function signJwt(payload: JwtPayload, secret: string, expiresIn = 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresIn };

  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${claimsB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${claimsB64}.${signature}`;
}

/**
 * Verify a JWT token. Returns payload or throws.
 */
export function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, claimsB64, signature] = parts;

  // Verify signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${claimsB64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSig) {
    throw new Error('Invalid JWT signature');
  }

  // Decode claims
  const claims = JSON.parse(base64urlDecode(claimsB64).toString());

  // Check expiration
  if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('JWT expired');
  }

  return claims as JwtPayload;
}

// ─── Middleware ────────────────────────────────────────────────────────────────

/**
 * Express middleware that validates JWT from Authorization header.
 *
 * Sets req.user to the decoded payload.
 */
export function authMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = verifyJwt(token, secret);
      (req as Request & { user?: JwtPayload }).user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

/**
 * Middleware that requires a specific role.
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const roles = (user.roles as string[]) ?? [];
    if (!roles.includes(role)) {
      res.status(403).json({ error: `Requires role: ${role}` });
      return;
    }

    next();
  };
}

// ─── Password Hashing (argon2id via crypto) ──────────────────────────────────

/**
 * Hash a password using scrypt (built-in, no deps).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

/**
 * Verify a password against a scrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [, salt, storedHash] = hash.split(':');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return derived.toString('hex') === storedHash;
}
