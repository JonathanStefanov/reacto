import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseDatabaseUrl, autoConfigure, configureDatabase } from './database.js';

describe('database', () => {
  describe('parseDatabaseUrl', () => {
    it('parses a standard postgres URL', () => {
      const config = parseDatabaseUrl('postgres://user:pass@localhost:5432/mydb');
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(5432);
      expect(config.database).toBe('mydb');
      expect(config.user).toBe('user');
      expect(config.password).toBe('pass');
      expect(config.ssl).toBeUndefined();
    });

    it('parses a URL with ssl=true', () => {
      const config = parseDatabaseUrl('postgres://user:pass@db.example.com:5432/mydb?ssl=true');
      expect(config.host).toBe('db.example.com');
      expect(config.ssl).toEqual({ rejectUnauthorized: false });
    });

    it('defaults port to 5432 when not specified', () => {
      const config = parseDatabaseUrl('postgres://user:pass@localhost/mydb');
      expect(config.port).toBe(5432);
    });

    it('handles postgresql:// protocol', () => {
      const config = parseDatabaseUrl('postgresql://u:p@host:5433/db');
      expect(config.host).toBe('host');
      expect(config.port).toBe(5433);
      expect(config.database).toBe('db');
    });

    it('strips leading slash from database name', () => {
      const config = parseDatabaseUrl('postgres://u:p@h/db');
      expect(config.database).toBe('db');
    });
  });

  describe('autoConfigure', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      vi.stubEnv('REACTO_DATABASE_URL', '');
      vi.stubEnv('DATABASE_URL', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('configures from REACTO_DATABASE_URL', () => {
      vi.stubEnv('REACTO_DATABASE_URL', 'postgres://u:p@h:5432/db');
      // Should not throw — just configures internally
      expect(() => autoConfigure()).not.toThrow();
    });

    it('configures from DATABASE_URL fallback', () => {
      vi.stubEnv('DATABASE_URL', 'postgres://u:p@h:5432/db');
      expect(() => autoConfigure()).not.toThrow();
    });

    it('does nothing when no env var is set', () => {
      // No env vars set — should be a no-op
      expect(() => autoConfigure()).not.toThrow();
    });
  });
});
