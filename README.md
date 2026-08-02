# Reacto

**Django for React** — A full-stack TypeScript framework with Django-style ORM, auto-generated APIs, and React frontend.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)

## Why Reacto?

Django revolutionized web development with its "batteries included" philosophy. Reacto brings that same power to the React/TypeScript ecosystem:

- **Django-style Models** — Class-based models with decorators that auto-map to PostgreSQL
- **Auto-generated APIs** — REST endpoints generated from your models, zero boilerplate
- **Auto Migrations** — Schema changes detected and migrations generated automatically
- **Type Safety** — End-to-end TypeScript, from database to frontend
- **Same Repo** — Backend and frontend in one project, one deploy

## Quick Start

```bash
# Create a new project
npx create-reacto my-app
cd my-app

# Configure database
export REACTO_DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"

# Start dev server
reacto dev
```

## Define Models

```typescript
// models/User.ts
import { Model, Field } from '@reacto/core';

export class User extends Model {
  @Field({ type: 'string', maxLength: 150, unique: true })
  username: string;

  @Field({ type: 'email' })
  email: string;

  @Field({ type: 'boolean', default: false })
  isStaff: boolean;

  static meta = {
    tableName: 'users',
    ordering: ['-createdAt'],
  };
}
```

## Query Data

```typescript
// Django-style ORM
const users = await ModelManager.objects(User)
  .filter({ isStaff: true })
  .orderBy('-createdAt')
  .limit(10)
  .all();

// Eager loading — solves N+1 query problem
const posts = await ModelManager.objects(Post)
  .filter({ published: true })
  .with('author')           // LEFT JOIN → author loaded in same query
  .all();
console.log(posts[0].author);  // already loaded, no extra query

// Fluent query builder
const results = await qb('users')
  .select('name', 'email')
  .where('age', '>', 18)
  .orderBy('name')
  .limit(10)
  .execute();
```

## Cascade Delete

Foreign key relations support cascade behavior:

```typescript
@ForeignKey(() => User, { onDelete: 'CASCADE' })
author: Id<User>;

// When you delete a user, all their posts are deleted automatically
const user = await ModelManager.objects(User).get({ id: 1 });
await user.delete();  // also deletes all posts where author_id = 1
```

Options: `CASCADE`, `SET NULL`, `RESTRICT`, `NO ACTION` (default: `CASCADE`)

## Validators

Field-level validation runs automatically on create/save:

```typescript
@Model()
class User extends Model {
  @Field({ type: 'string', validators: [required(), minLength(3)] })
  username: string;

  @Field({ type: 'email', validators: [required(), email()] })
  email: string;
}

// Throws ValidationError if invalid
await ModelManager.create(User, { username: 'ab', email: 'bad' });
// → ValidationError: username must be at least 3 characters; Must be a valid email
```

Built-in validators: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `email`, `url`, `oneOf`, `custom`

## Signals

Django-style lifecycle hooks:

```typescript
import { preSave, postSave, preDelete, postDelete } from '@reacto/core';

preSave(User, async (user) => {
  user.password = await hash(user.password);
});

postSave(User, async (user) => {
  await sendWelcomeEmail(user.email);
});

preDelete(User, async (user) => {
  await cleanupUserData(user.id);
});
```

## Authentication

Built-in JWT auth middleware:

```typescript
import { authMiddleware, requireAuth, signJwt } from '@reacto/server';

// Add to your app
app.use(authMiddleware({ secret: 'your-secret' }));

// Protect specific routes
app.get('/api/admin', requireAuth(), handler);

// Generate tokens
const token = signJwt({ sub: user.id }, 'your-secret', 86400);
```

## WebSocket (Real-time)

Real-time subscriptions via WebSocket:

```typescript
import { createServer } from '@reacto/server';

// Enable WebSocket when creating server
const { app, server, ws } = createServer({ websocket: true });

// WebSocket auto-broadcasts model changes to subscribers
```

**Client (React):**
```tsx
import { useSubscription } from '@reacto/frontend';

function LiveFeed() {
  const { data, connected } = useSubscription('posts', { token: 'jwt-token' });

  return (
    <div>
      <span>{connected ? '\u0001f7e2 Live' : '\u0001f534 Offline'}</span>
      {data.map(post => <div key={post.id}>{post.title}</div>)}
    </div>
  );
}
```

**Protocol:**
```json
// Subscribe
{ "type": "subscribe", "channel": "posts" }

// Receive events
{ "type": "created", "model": "Post", "id": 1, "data": { ... }, "timestamp": "..." }
{ "type": "updated", "model": "Post", "id": 1, "data": { ... } }
{ "type": "deleted", "model": "Post", "id": 1 }
```

## Auto-generated API

Your models automatically get REST endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/` | List (with pagination, filtering, ordering) |
| `POST` | `/api/users/` | Create |
| `GET` | `/api/users/:id` | Retrieve |
| `PUT` | `/api/users/:id` | Update |
| `PATCH` | `/api/users/:id` | Partial update |
| `DELETE` | `/api/users/:id` | Delete (respects cascade) |
| `GET` | `/api/users/count` | Count |
| `POST` | `/api/users/bulk` | Bulk create |

### Nested Relation Routes

Relations auto-generate nested endpoints:

```bash
# ForeignKey: GET /:id/<relation> → get related object
GET  /api/posts/1/author     → the author of post 1

# OneToMany: GET /:id/<relation> → list related objects
GET  /api/users/1/posts      → all posts by user 1

# OneToMany: POST /:id/<relation> → create with FK set
POST /api/users/1/posts      → create post with author=user 1
```

### Eager Loading via API

Add `?with=` to include related objects in the response:

```bash
GET /api/posts?with=author
# → [{ "title": "Hello", "author": { "username": "john" } }]

GET /api/posts/1?with=author
# → { "title": "Hello", "author": { "username": "john" } }
```

## CLI Commands

```bash
reacto dev              # Start dev server
reacto migrate          # Apply pending migrations
reacto makemigrations   # Generate migration files
reacto createsuperuser  # Create admin user
reacto generate model User --fields "name:string,email:email,age:int"
reacto status           # Show project status
```

## Project Structure

```
my-app/
├── models/             # Django-style model definitions
│   ├── User.ts
│   └── Post.ts
├── routes/             # Custom API routes (optional)
├── middleware/          # Custom middleware
├── frontend/           # React frontend
│   ├── pages/
│   └── components/
├── app.ts              # Server entry point
├── reacto.config.ts    # Configuration
└── package.json
```

## Packages

| Package | Description |
|---------|-------------|
| `@reacto/core` | ORM, models, migrations, query builder |
| `@reacto/server` | HTTP server with auto-generated CRUD routes |
| `reacto` | CLI tool (migrate, dev, generate, etc.) |
| `@reacto/admin` | Auto-generated admin panel (coming soon) |
| `create-reacto` | Project scaffolder (coming soon) |

## Tech Stack

- **Runtime:** Node.js 20+ (Bun compatible)
- **Language:** TypeScript 5.5+
- **Frontend:** React 19 + Vite
- **Database:** PostgreSQL 14+
- **ORM:** Custom (Django-inspired)
- **Server:** Express 5
- **Validation:** Zod
- **Testing:** Vitest

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACTO_DATABASE_URL` | PostgreSQL connection string | — |
| `REACTO_DEBUG` | Enable SQL query logging | `false` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |

## License

MIT © Jonathan Stefanov
