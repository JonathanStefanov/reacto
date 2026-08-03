# Signals (Lifecycle Hooks)

Execute code before/after model operations.

## Signal Types

| Signal | When |
|---|---|
| `preSave` | Before create or update |
| `postSave` | After create or update |
| `preDelete` | Before delete |
| `postDelete` | After delete |

## Using Signals

```typescript
import { Signal, Model, Field } from '@reacto-org/core';

@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string' })
  password!: string;

  @Signal('preSave')
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      const bcrypt = await import('bcryptjs');
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  @Signal('postSave')
  async logCreation() {
    console.log(`User ${this.id} saved`);
  }

  @Signal('preDelete')
  async cleanup() {
    // Delete related data
  }
}
```

## Multiple Signals

You can have multiple handlers for the same signal:

```typescript
@Model({ tableName: 'posts' })
export class Post {
  @Signal('preSave')
  validateTitle() {
    if (!this.title?.trim()) {
      throw new Error('Title is required');
    }
  }

  @Signal('preSave')
  slugify() {
    this.slug = this.title.toLowerCase().replace(/\s+/g, '-');
  }

  @Signal('postSave')
  async notifySubscribers() {
    // Send notifications
  }
}
```

## Async Signals

Signals support async operations:

```typescript
@Signal('postSave')
async updateSearchIndex() {
  await searchIndex.update(this.id, this.toJSON());
}
```

## Accessing Instance Data

`this` refers to the model instance:

```typescript
@Signal('preSave')
validate() {
  console.log(this.id);        // undefined for new, number for existing
  console.log(this.username);  // field values
}
```

## Programmatic API

```typescript
import { runSignal, getSignals, clearSignals } from '@reacto-org/core';

// Run signals manually
await runSignal(User, 'preSave', userInstance);

// Get registered signals
const signals = getSignals(User);

// Clear signals (for testing)
clearSignals(User);
```

## Common Patterns

### Password Hashing

```typescript
@Signal('preSave')
async hashPassword() {
  if (this.password && !this.password.startsWith('$2')) {
    const bcrypt = await import('bcryptjs');
    this.password = await bcrypt.hash(this.password, 10);
  }
}
```

### Auto-timestamps

```typescript
@Signal('preSave')
setTimestamps() {
  if (!this.id) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
}
```

### Validation

```typescript
@Signal('preSave')
validate() {
  if (this.rating < 1 || this.rating > 10) {
    throw new Error('Rating must be 1-10');
  }
}
```

### Cascade Operations

```typescript
@Signal('preDelete')
async cascadeDelete() {
  await ModelManager.objects(Review)
    .filter({ userId: this.id })
    .delete();
}
```
