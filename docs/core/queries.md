# QuerySet & Queries

QueryBuilder provides a Django-style API for querying the database.

## Basic Queries

```typescript
import { ModelManager } from '@reacto-org/core';

// Get all
const users = await ModelManager.objects(User).all();

// Get by ID
const user = await ModelManager.objects(User).get({ id: 1 });

// First
const user = await ModelManager.objects(User)
  .filter({ isActive: true })
  .first();

// Count
const count = await ModelManager.objects(User).count();

// Exists
const exists = await ModelManager.objects(User)
  .filter({ email: 'john@example.com' })
  .exists();
```

## Filtering

```typescript
// Exact match
const users = await ModelManager.objects(User)
  .filter({ isActive: true, role: 'admin' })
  .all();

// Exclude
const users = await ModelManager.objects(User)
  .exclude({ role: 'banned' })
  .all();
```

## Ordering

```typescript
// Ascending
const users = await ModelManager.objects(User)
  .orderBy('username')
  .all();

// Descending
const users = await ModelManager.objects(User)
  .orderBy('-createdAt')
  .all();

// Multiple
const users = await ModelManager.objects(User)
  .orderBy('role', '-createdAt')
  .all();
```

## Pagination

```typescript
const users = await ModelManager.objects(User)
  .paginate(page, pageSize)
  .all();

// Or manually
const users = await ModelManager.objects(User)
  .limit(20)
  .offset(40)
  .all();
```

## Select Specific Fields

```typescript
const users = await ModelManager.objects(User)
  .select('id', 'username', 'email')
  .all();
```

## Search

```typescript
// ILIKE search (default)
const movies = await ModelManager.objects(Movie)
  .search(['title', 'director'], 'nolan')
  .all();

// Full-text search (PostgreSQL tsvector)
const movies = await ModelManager.objects(Movie)
  .search(['title', 'description'], 'dream technology', { fullText: true })
  .all();
```

## Aggregation

```typescript
const result = await ModelManager.objects(User).aggregate({
  function: 'COUNT',
});

const result = await ModelManager.objects(Order).aggregate({
  function: 'SUM',
  field: 'total',
  groupBy: ['status'],
});
```

## Caching

```typescript
const movies = await ModelManager.objects(Movie)
  .cache(300) // Cache for 5 minutes
  .all();
```

## Eager Loading

```typescript
const posts = await ModelManager.objects(Post)
  .with('author', 'comments')
  .all();
```

## Chaining

All methods are chainable:

```typescript
const movies = await ModelManager.objects(Movie)
  .filter({ genre: 'Sci-Fi' })
  .search(['title'], 'nolan')
  .orderBy('-averageRating')
  .cache(60)
  .paginate(1, 12)
  .all();
```

## Delete & Update

```typescript
// Delete matching
const deleted = await ModelManager.objects(User)
  .filter({ isActive: false })
  .delete();

// Update matching
const updated = await ModelManager.objects(User)
  .filter({ role: 'user' })
  .update({ role: 'member' });
```
