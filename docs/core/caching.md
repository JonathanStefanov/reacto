# Caching

Cache query results with automatic invalidation.

## QuerySet Caching

```typescript
const movies = await ModelManager.objects(Movie)
  .cache(300) // Cache for 5 minutes (300 seconds)
  .all();
```

## Cache Backends

### In-Memory (Default)

```typescript
import { configureCache } from '@reacto-org/core';

configureCache({
  memory: {
    maxSize: 1000,    // Max entries (default: 1000)
    defaultTtl: 300,  // Default TTL in seconds (default: 300)
  },
});
```

### Redis

```typescript
import { configureCache } from '@reacto-org/core';
import Redis from 'ioredis';

const redis = new Redis();

configureCache({
  redis: {
    client: redis,
    prefix: 'myapp:',  // Key prefix
    defaultTtl: 300,
  },
});
```

## Manual Caching

```typescript
import { getCache } from '@reacto-org/core';

const cache = getCache();

// Set
await cache.set('my-key', { data: 'value' }, 60);

// Get
const value = await cache.get('my-key');

// Delete
await cache.delete('my-key');

// Clear all
await cache.clear();

// Cache-aside pattern
const data = await cache.getOrSet('expensive-query', async () => {
  return await computeExpensiveData();
}, 300);
```

## Signal-Aware Invalidation

Cache is automatically invalidated when models change:

```typescript
// This query is cached
const users = await ModelManager.objects(User)
  .filter({ isActive: true })
  .cache(300)
  .all();

// When any User is saved/deleted, the cache is invalidated
await user.save(); // → cache cleared for User queries
```

## Pattern Invalidation

```typescript
const cache = getCache();

// Invalidate all keys matching pattern
await cache.invalidatePattern('reacto:User:*');

// Invalidate specific model
await cache.invalidateModel('User');
```

## Cache Stats

```typescript
const cache = getCache();
const stats = await cache.stats();

console.log(stats.size);     // Number of entries
console.log(stats.backend);  // 'MemoryCacheBackend' or 'RedisCacheBackend'
```
