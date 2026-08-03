# Models & Fields

Models define your database tables. Use decorators to declare fields, relations, and hooks.

## Defining a Model

```typescript
import { Field, Model } from '@reacto-org/core';

@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string', maxLength: 100 })
  username!: string;

  @Field({ type: 'email', unique: true })
  email!: string;

  @Field({ type: 'boolean', default: true })
  isActive!: boolean;
}
```

## Model Options

```typescript
@Model({
  tableName: 'users',           // Required: database table name
  ordering: ['-createdAt'],     // Default ordering
  uniqueTogether: [['email', 'username']],  // Unique constraints
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['username'] },
  ],
  verboseName: 'user',          // Human-readable name
  verboseNamePlural: 'users',   // Plural name
})
```

## Built-in Fields

Every model automatically gets:

| Field | Type | Description |
|---|---|---|
| `id` | `integer` | Primary key, auto-increment |
| `createdAt` | `datetime` | Set on creation |
| `updatedAt` | `datetime` | Set on every save |

## Field Decorator

```typescript
@Field({
  type: 'string',        // Required: field type
  maxLength: 255,        // For string types
  unique: true,          // Unique constraint
  nullable: true,        // Allow NULL
  default: 'value',      // Default value
  index: true,           // Create index
  choices: { A: 'a', B: 'b' },  // Allowed values
  verboseName: 'Email',  // Human-readable name
  helpText: 'User email', // Help text
  validators: [],        // Custom validators
})
```

## Registering Models

Models are auto-registered when imported. Just import your models in `server.ts`:

```typescript
// server.ts
import './models/index.js'; // All models registered
```

Or in SSR mode, the framework auto-discovers `models/` directory.

## CRUD Operations

```typescript
import { ModelManager } from '@reacto-org/core';

// Create
const user = await ModelManager.create(User, {
  username: 'john',
  email: 'john@example.com',
});

// Read
const users = await ModelManager.objects(User).all();
const user = await ModelManager.objects(User).get({ id: 1 });
const filtered = await ModelManager.objects(User)
  .filter({ isActive: true })
  .all();

// Update
user.username = 'jane';
await user.save();

// Delete
await user.delete();
```

## Model Instance Methods

```typescript
const user = new User();
user.username = 'john';

await user.save();      // Save to database
await user.delete();    // Delete from database
await user.refresh();   // Reload from database
user.toJSON();          // Convert to plain object
```
