import { describe, it, expect } from 'vitest';
import { signJwt, verifyJwt } from './auth.js';

describe('auth middleware', () => {
  const secret = 'test-secret-key';

  describe('signJwt', () => {
    it('creates a valid JWT token', () => {
      const token = signJwt({ sub: 1 }, secret);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('includes payload in token', () => {
      const token = signJwt({ sub: 42, username: 'john' }, secret);
      const payload = verifyJwt(token, secret);
      expect(payload.sub).toBe(42);
      expect(payload.username).toBe('john');
    });

    it('sets iat and exp', () => {
      const token = signJwt({ sub: 1 }, secret);
      const payload = verifyJwt(token, secret);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
      expect(payload.exp! > payload.iat!).toBe(true);
    });

    it('respects custom expiresIn', () => {
      const token = signJwt({ sub: 1 }, secret, 60);
      const payload = verifyJwt(token, secret);
      expect(payload.exp! - payload.iat!).toBe(60);
    });
  });

  describe('verifyJwt', () => {
    it('verifies a valid token', () => {
      const token = signJwt({ sub: 1, role: 'admin' }, secret);
      const payload = verifyJwt(token, secret);
      expect(payload.sub).toBe(1);
      expect(payload.role).toBe('admin');
    });

    it('rejects a token signed with wrong secret', () => {
      const token = signJwt({ sub: 1 }, 'wrong-secret');
      expect(() => verifyJwt(token, secret)).toThrow('Invalid token signature');
    });

    it('rejects an expired token', () => {
      const token = signJwt({ sub: 1 }, secret, -10); // already expired
      expect(() => verifyJwt(token, secret)).toThrow('Token expired');
    });

    it('rejects a malformed token', () => {
      expect(() => verifyJwt('not.a.jwt', secret)).toThrow();
    });

    it('rejects a token with invalid format', () => {
      expect(() => verifyJwt('invalid', secret)).toThrow('Invalid token format');
    });

    it('rejects a tampered token', () => {
      const token = signJwt({ sub: 1 }, secret);
      const parts = token.split('.');
      parts[1] = Buffer.from(JSON.stringify({ sub: 999 })).toString('base64url');
      const tampered = parts.join('.');
      expect(() => verifyJwt(tampered, secret)).toThrow('Invalid token signature');
    });
  });
});
