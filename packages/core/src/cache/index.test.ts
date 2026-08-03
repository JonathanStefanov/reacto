/**
 * Tests for Reacto Cache Manager
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryCacheBackend,
  CacheManager,
  getCache,
  configureCache,
  resetCache,
  queryCacheKey,
} from './index.js';

// ─── MemoryCacheBackend ──────────────────────────────────────────────────────

describe('MemoryCacheBackend', () => {
  let cache: MemoryCacheBackend;

  beforeEach(() => {
    cache = new MemoryCacheBackend({ maxSize: 5, defaultTtl: 60, checkPeriod: 0 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('stores and retrieves values', async () => {
    await cache.set('key1', { name: 'John' });
    const result = await cache.get('key1');
    expect(result).toEqual({ name: 'John' });
  });

  it('returns null for missing keys', async () => {
    const result = await cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('respects TTL expiration', async () => {
    await cache.set('short-lived', 'data', 0.01); // 10ms
    // Wait for expiration
    await new Promise((r) => setTimeout(r, 50));
    const result = await cache.get('short-lived');
    expect(result).toBeNull();
  });

  it('deletes entries', async () => {
    await cache.set('to-delete', 'value');
    await cache.delete('to-delete');
    expect(await cache.get('to-delete')).toBeNull();
  });

  it('clears all entries', async () => {
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.clear();
    expect(await cache.size()).toBe(0);
  });

  it('checks existence', async () => {
    await cache.set('exists', true);
    expect(await cache.has('exists')).toBe(true);
    expect(await cache.has('nope')).toBe(false);
  });

  it('reports expired entries as not existing', async () => {
    await cache.set('expired', 'val', 0.01);
    await new Promise((r) => setTimeout(r, 50));
    expect(await cache.has('expired')).toBe(false);
  });

  it('lists keys with optional glob pattern', async () => {
    await cache.set('user:1', 'a');
    await cache.set('user:2', 'b');
    await cache.set('post:1', 'c');

    const allKeys = await cache.keys();
    expect(allKeys).toHaveLength(3);

    const userKeys = await cache.keys('user:*');
    expect(userKeys).toHaveLength(2);
    expect(userKeys).toContain('user:1');
    expect(userKeys).toContain('user:2');
  });

  it('evicts LRU entries when at capacity', async () => {
    // Fill to capacity (5)
    for (let i = 0; i < 5; i++) {
      await cache.set(`key-${i}`, i);
    }
    expect(await cache.size()).toBe(5);

    // Access key-0 to make it recently used
    await cache.get('key-0');

    // Add one more — should evict key-1 (least recently used)
    await cache.set('key-5', 5);
    expect(await cache.size()).toBe(5);
    expect(await cache.get('key-0')).toBe(0); // still cached (was touched)
    expect(await cache.get('key-1')).toBeNull(); // evicted
  });

  it('uses default TTL when not specified', async () => {
    // defaultTtl is 60s in this test
    await cache.set('with-default', 'val');
    const entry = (cache as unknown as { store: Map<string, { expiresAt: number }> }).store.get('with-default');
    expect(entry!.expiresAt).toBeGreaterThan(Date.now());
    expect(entry!.expiresAt).toBeLessThanOrEqual(Date.now() + 60_000 + 100);
  });

  it('reports size correctly', async () => {
    expect(await cache.size()).toBe(0);
    await cache.set('a', 1);
    expect(await cache.size()).toBe(1);
    await cache.set('b', 2);
    expect(await cache.size()).toBe(2);
    await cache.delete('a');
    expect(await cache.size()).toBe(1);
  });
});

// ─── CacheManager ────────────────────────────────────────────────────────────

describe('CacheManager', () => {
  let manager: CacheManager;
  let backend: MemoryCacheBackend;

  beforeEach(() => {
    backend = new MemoryCacheBackend({ checkPeriod: 0 });
    manager = new CacheManager(backend, 'test');
  });

  afterEach(() => {
    backend.destroy();
  });

  it('builds deterministic cache keys', () => {
    const key1 = manager.buildKey('User', { active: true }, 'all');
    const key2 = manager.buildKey('User', { active: true }, 'all');
    const key3 = manager.buildKey('User', { active: false }, 'all');

    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toMatch(/^test:User:/);
  });

  it('get/set/delete through manager', async () => {
    await manager.set('mykey', [1, 2, 3]);
    expect(await manager.get('mykey')).toEqual([1, 2, 3]);
    await manager.delete('mykey');
    expect(await manager.get('mykey')).toBeNull();
  });

  it('getOrSet caches factory result', async () => {
    const factory = vi.fn(async () => ({ data: 'expensive' }));

    const result1 = await manager.getOrSet('factory-key', factory, 60);
    const result2 = await manager.getOrSet('factory-key', factory, 60);

    expect(result1).toEqual({ data: 'expensive' });
    expect(result2).toEqual({ data: 'expensive' });
    expect(factory).toHaveBeenCalledTimes(1); // only called once!
  });

  it('getOrSet re-calls factory on cache miss', async () => {
    let counter = 0;
    const factory = async () => ++counter;

    const r1 = await manager.getOrSet('counter', factory, 0.01);
    await new Promise((r) => setTimeout(r, 50));
    const r2 = await manager.getOrSet('counter', factory, 0.01);

    expect(r1).toBe(1);
    expect(r2).toBe(2);
  });

  it('tracks and invalidates model keys', async () => {
    const key1 = manager.buildKey('User', 'list');
    const key2 = manager.buildKey('User', 'count');

    await manager.set(key1, [1, 2]);
    await manager.set(key2, 2);

    manager.trackKey('User', key1);
    manager.trackKey('User', key2);

    await manager.invalidateModel('User');

    expect(await manager.get(key1)).toBeNull();
    expect(await manager.get(key2)).toBeNull();
  });

  it('invalidates by pattern', async () => {
    await manager.set('reacto:User:abc', 'a');
    await manager.set('reacto:User:def', 'b');
    await manager.set('reacto:Post:xyz', 'c');

    await manager.invalidatePattern('reacto:User:*');

    expect(await manager.get('reacto:User:abc')).toBeNull();
    expect(await manager.get('reacto:User:def')).toBeNull();
    expect(await manager.get('reacto:Post:xyz')).toBe('c');
  });

  it('clears everything', async () => {
    await manager.set('a', 1);
    await manager.set('b', 2);
    manager.trackKey('User', 'a');

    await manager.clear();

    expect(await manager.get('a')).toBeNull();
    expect(await manager.get('b')).toBeNull();
  });

  it('returns stats', async () => {
    await manager.set('x', 1);
    await manager.set('y', 2);
    const stats = await manager.stats();
    expect(stats.size).toBe(2);
    expect(stats.backend).toBe('MemoryCacheBackend');
  });

  it('can swap backends', async () => {
    const newBackend = new MemoryCacheBackend({ checkPeriod: 0 });
    manager.setBackend(newBackend);

    await manager.set('key', 'value');
    expect(await manager.get('key')).toBe('value');

    newBackend.destroy();
  });
});

// ─── Singleton Functions ─────────────────────────────────────────────────────

describe('getCache / configureCache / resetCache', () => {
  afterEach(() => {
    resetCache();
  });

  it('getCache returns a CacheManager', () => {
    const cache = getCache();
    expect(cache).toBeInstanceOf(CacheManager);
  });

  it('getCache returns same instance', () => {
    const a = getCache();
    const b = getCache();
    expect(a).toBe(b);
  });

  it('configureCache creates new instance with memory backend', () => {
    const cache = configureCache({ memory: { maxSize: 100 } });
    expect(cache).toBeInstanceOf(CacheManager);
    expect(cache).toBe(getCache());
  });

  it('configureCache accepts custom backend', async () => {
    const customBackend = new MemoryCacheBackend({ checkPeriod: 0 });
    const cache = configureCache({ backend: customBackend });

    await cache.set('test', 123);
    expect(await cache.get('test')).toBe(123);

    customBackend.destroy();
  });

  it('resetCache clears singleton', () => {
    const a = getCache();
    resetCache();
    const b = getCache();
    expect(a).not.toBe(b);
  });
});

// ─── queryCacheKey ───────────────────────────────────────────────────────────

describe('queryCacheKey', () => {
  afterEach(() => {
    resetCache();
  });

  it('generates consistent keys', () => {
    const k1 = queryCacheKey('User', 'all', { active: true });
    const k2 = queryCacheKey('User', 'all', { active: true });
    expect(k1).toBe(k2);
  });

  it('generates different keys for different params', () => {
    const k1 = queryCacheKey('User', 'filter', { role: 'admin' });
    const k2 = queryCacheKey('User', 'filter', { role: 'user' });
    expect(k1).not.toBe(k2);
  });

  it('generates different keys for different models', () => {
    const k1 = queryCacheKey('User', 'all');
    const k2 = queryCacheKey('Post', 'all');
    expect(k1).not.toBe(k2);
  });
});

// ─── Redis Backend (unit tests with mock client) ─────────────────────────────

describe('RedisCacheBackend', () => {
  // We test the interface contract with a mock Redis client
  // No actual Redis connection needed

  it('correctly prefixes keys and serializes data', async () => {
    // Dynamically import to avoid issues if ioredis isn't installed
    const { RedisCacheBackend } = await import('./index.js');

    const store = new Map<string, string>();
    const mockClient = {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: string, _mode?: string, _ttl?: number) => {
        store.set(key, value);
      },
      del: async (keys: string | string[]) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        for (const k of arr) store.delete(k);
        return arr.length;
      },
      keys: async (pattern: string) => {
        const prefix = pattern.replace(/\*/g, '');
        return Array.from(store.keys()).filter((k) => k.startsWith(prefix));
      },
      flushdb: async () => { store.clear(); },
      dbsize: async () => store.size,
    };

    const backend = new RedisCacheBackend({
      client: mockClient,
      prefix: 'test:',
      defaultTtl: 60,
    });

    await backend.set('mykey', { foo: 'bar' });
    expect(store.has('test:mykey')).toBe(true);

    const result = await backend.get<{ foo: string }>('mykey');
    expect(result).toEqual({ foo: 'bar' });

    expect(await backend.has('mykey')).toBe(true);

    await backend.delete('mykey');
    expect(await backend.has('mykey')).toBe(false);
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe('Cache edge cases', () => {
  afterEach(() => {
    resetCache();
  });

  it('handles null values', async () => {
    const cache = getCache();
    await cache.set('null-val', null);

    // null is returned as null (cache miss)
    expect(await cache.get('null-val')).toBeNull();
  });

  it('handles nested objects and arrays', async () => {
    const cache = getCache();
    const complex = {
      users: [{ id: 1, name: 'Alice', meta: { role: 'admin' } }],
      total: 1,
      nested: { deep: { deeper: [1, 2, 3] } },
    };

    await cache.set('complex', complex);
    const result = await cache.get('complex');
    expect(result).toEqual(complex);
  });

  it('handles concurrent reads and writes', async () => {
    const backend = new MemoryCacheBackend({ maxSize: 100, checkPeriod: 0 });
    const manager = new CacheManager(backend, 'concurrent');

    // Simulate concurrent writes
    const writes = Array.from({ length: 50 }, (_, i) =>
      manager.set(`key-${i}`, i)
    );
    await Promise.all(writes);

    expect(await backend.size()).toBe(50);

    // Simulate concurrent reads
    const reads = Array.from({ length: 50 }, (_, i) =>
      manager.get<number>(`key-${i}`)
    );
    const results = await Promise.all(reads);

    for (let i = 0; i < 50; i++) {
      expect(results[i]).toBe(i);
    }

    backend.destroy();
  });

  it('handles large values', async () => {
    const cache = getCache();
    const largeArray = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
    }));

    await cache.set('large', largeArray);
    const result = await cache.get<Array<{ id: number }>>('large');
    expect(result).toHaveLength(10000);
    expect(result![9999].id).toBe(9999);
  });

  it('MemoryCacheBackend cleanup removes expired entries', async () => {
    vi.useFakeTimers();

    const backend = new MemoryCacheBackend({ checkPeriod: 0 });
    await backend.set('expires-soon', 'data', 1); // 1 second TTL

    expect(await backend.size()).toBe(1);

    // Advance time past TTL
    vi.advanceTimersByTime(2000);

    // Manual cleanup (normally done by timer)
    // Access it to trigger the expired check
    const result = await backend.get('expires-soon');
    expect(result).toBeNull();

    backend.destroy();
    vi.useRealTimers();
  });
});
