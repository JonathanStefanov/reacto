/**
 * Reacto — Cache Manager
 *
 * Provides caching for QuerySet results with automatic invalidation via signals.
 *
 * Features:
 *   - In-memory LRU cache with TTL
 *   - Optional Redis backend
 *   - QuerySet.cache(ttl) for query-level caching
 *   - Signal-aware: auto-invalidate on model save/delete
 *   - @Cacheable decorator for custom caching
 *   - Cache key generation from model + query
 *
 * @example
 *   // QuerySet caching
 *   const users = await ModelManager.objects(User)
 *     .filter({ isActive: true })
 *     .cache(300) // cache for 5 minutes
 *     .all();
 *
 *   // Manual cache
 *   import { cache } from '@reacto/core';
 *   await cache.set('my-key', data, 60);
 *   const data = await cache.get('my-key');
 */
import { createHash } from 'crypto';

// ─── Cache Entry ──────────────────────────────────────────────────────────────

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

// ─── Cache Backend Interface ──────────────────────────────────────────────────

export interface CacheBackend {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  size(): Promise<number>;
}

// ─── In-Memory LRU Cache ─────────────────────────────────────────────────────

export interface MemoryCacheOptions {
  maxSize?: number;      // max entries (default: 1000)
  defaultTtl?: number;   // default TTL in seconds (default: 300)
  checkPeriod?: number;  // cleanup interval in ms (default: 60000)
}

export class MemoryCacheBackend implements CacheBackend {
  private store = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private maxSize: number;
  private defaultTtl: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: MemoryCacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTtl = options.defaultTtl ?? 300;

    const checkPeriod = options.checkPeriod ?? 60_000;
    if (checkPeriod > 0) {
      this.cleanupTimer = setInterval(() => this.cleanup(), checkPeriod);
      // Allow the process to exit even if the timer is running
      if (this.cleanupTimer.unref) {
        this.cleanupTimer.unref();
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // Move to end (most recently used)
    this.touchKey(key);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtl;

    // Evict if at capacity
    if (!this.store.has(key) && this.store.size >= this.maxSize) {
      this.evictLRU();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
      createdAt: Date.now(),
    });

    this.touchKey(key);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.removeFromAccessOrder(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.accessOrder = [];
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }
    return true;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys()).filter((key) => {
      const entry = this.store.get(key)!;
      if (Date.now() > entry.expiresAt) {
        this.store.delete(key);
        this.removeFromAccessOrder(key);
        return false;
      }
      return true;
    });

    if (!pattern) return allKeys;

    // Simple glob pattern matching (* and ?)
    const regex = new RegExp(
      '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return allKeys.filter((k) => regex.test(k));
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  /**
   * Destroy the cleanup timer (for testing or shutdown).
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private touchKey(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    const oldest = this.accessOrder.shift()!;
    this.store.delete(oldest);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        this.removeFromAccessOrder(key);
      }
    }
  }
}

// ─── Redis Cache Backend ──────────────────────────────────────────────────────

export interface RedisCacheOptions {
  client: unknown; // ioredis or node-redis client
  prefix?: string;
  defaultTtl?: number;
  serializer?: {
    serialize: (value: unknown) => string;
    deserialize: (value: string) => unknown;
  };
}

export class RedisCacheBackend implements CacheBackend {
  private client: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, mode?: string, ttl?: number) => Promise<unknown>;
    del: (key: string | string[]) => Promise<number>;
    keys: (pattern: string) => Promise<string[]>;
    flushdb: () => Promise<unknown>;
    dbsize: () => Promise<number>;
  };
  private prefix: string;
  private defaultTtl: number;
  private serializer: { serialize: (v: unknown) => string; deserialize: (v: string) => unknown };

  constructor(options: RedisCacheOptions) {
    this.client = options.client as typeof this.client;
    this.prefix = options.prefix ?? 'reacto:cache:';
    this.defaultTtl = options.defaultTtl ?? 300;
    this.serializer = options.serializer ?? {
      serialize: JSON.stringify,
      deserialize: JSON.parse,
    };
  }

  private prefixed(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(this.prefixed(key));
    if (raw === null) return null;
    try {
      return this.serializer.deserialize(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.defaultTtl;
    const serialized = this.serializer.serialize(value);
    await this.client.set(this.prefixed(key), serialized, 'EX', ttl);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.prefixed(key));
  }

  async clear(): Promise<void> {
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async has(key: string): Promise<boolean> {
    const val = await this.client.get(this.prefixed(key));
    return val !== null;
  }

  async keys(pattern?: string): Promise<string[]> {
    const searchPattern = pattern ? this.prefixed(pattern) : `${this.prefix}*`;
    const rawKeys = await this.client.keys(searchPattern);
    return rawKeys.map((k: string) => k.slice(this.prefix.length));
  }

  async size(): Promise<number> {
    return await this.client.dbsize();
  }
}

// ─── Cache Manager ───────────────────────────────────────────────────────────

export class CacheManager {
  private backend: CacheBackend;
  private namespace: string;
  private modelInvalidationKeys = new Map<string, Set<string>>();

  constructor(backend?: CacheBackend, namespace = 'reacto') {
    this.backend = backend ?? new MemoryCacheBackend();
    this.namespace = namespace;
  }

  /**
   * Get the underlying backend.
   */
  getBackend(): CacheBackend {
    return this.backend;
  }

  /**
   * Replace the cache backend (e.g., switch from memory to Redis).
   */
  setBackend(backend: CacheBackend): void {
    this.backend = backend;
  }

  /**
   * Build a cache key from model name + query parameters.
   */
  buildKey(modelName: string, ...parts: unknown[]): string {
    const hash = createHash('sha256')
      .update(JSON.stringify(parts))
      .digest('hex')
      .slice(0, 16);
    return `${this.namespace}:${modelName}:${hash}`;
  }

  /**
   * Get a cached value.
   */
  async get<T>(key: string): Promise<T | null> {
    return this.backend.get<T>(key);
  }

  /**
   * Set a cached value with TTL.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.backend.set(key, value, ttlSeconds);
  }

  /**
   * Delete a cached key.
   */
  async delete(key: string): Promise<void> {
    await this.backend.delete(key);
  }

  /**
   * Check if a key exists.
   */
  async has(key: string): Promise<boolean> {
    return this.backend.has(key);
  }

  /**
   * Clear all cached entries.
   */
  async clear(): Promise<void> {
    await this.backend.clear();
    this.modelInvalidationKeys.clear();
  }

  /**
   * Get/set with a factory function (cache-aside pattern).
   * Returns cached value if available, otherwise runs factory and caches result.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Register a cache key for automatic model invalidation.
   */
  trackKey(modelName: string, key: string): void {
    if (!this.modelInvalidationKeys.has(modelName)) {
      this.modelInvalidationKeys.set(modelName, new Set());
    }
    this.modelInvalidationKeys.get(modelName)!.add(key);
  }

  /**
   * Invalidate all cached entries for a model.
   * Called automatically by signal handlers on save/delete.
   */
  async invalidateModel(modelName: string): Promise<void> {
    const keys = this.modelInvalidationKeys.get(modelName);
    if (!keys) return;

    for (const key of keys) {
      await this.backend.delete(key);
    }
    keys.clear();
  }

  /**
   * Invalidate all cache entries matching a pattern.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.backend.keys(pattern);
    for (const key of keys) {
      await this.backend.delete(key);
    }
  }

  /**
   * Get cache stats (useful for monitoring).
   */
  async stats(): Promise<{ size: number; backend: string }> {
    return {
      size: await this.backend.size(),
      backend: this.backend.constructor.name,
    };
  }
}

// ─── Singleton Instance ──────────────────────────────────────────────────────

let defaultCache: CacheManager | null = null;

/**
 * Get the default cache manager instance.
 */
export function getCache(): CacheManager {
  if (!defaultCache) {
    defaultCache = new CacheManager();
  }
  return defaultCache;
}

/**
 * Configure the default cache manager with a specific backend.
 */
export function configureCache(options?: {
  backend?: CacheBackend;
  memory?: MemoryCacheOptions;
  redis?: RedisCacheOptions;
  namespace?: string;
}): CacheManager {
  let backend: CacheBackend;

  if (options?.backend) {
    backend = options.backend;
  } else if (options?.redis) {
    backend = new RedisCacheBackend(options.redis);
  } else {
    backend = new MemoryCacheBackend(options?.memory);
  }

  defaultCache = new CacheManager(backend, options?.namespace);
  return defaultCache;
}

/**
 * Reset the default cache (for testing).
 */
export function resetCache(): void {
  if (defaultCache) {
    const backend = defaultCache.getBackend();
    if (backend instanceof MemoryCacheBackend) {
      backend.destroy();
    }
  }
  defaultCache = null;
}

// ─── Cache Key Builder ───────────────────────────────────────────────────────

/**
 * Generate a deterministic cache key from a query specification.
 */
export function queryCacheKey(
  modelName: string,
  operation: string,
  params?: Record<string, unknown>
): string {
  const cache = getCache();
  return cache.buildKey(modelName, operation, params ?? {});
}
