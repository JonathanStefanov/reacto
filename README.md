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
import { Model, Field, OneToMany } from '@reacto/core';

// Table name auto-derived: "users"
@Model()
export class User extends Model {
  @Field({ type: 'string', maxLength: 150, unique: true })
  username: string;

  @Field({ type: 'email' })
  email: string;

  @Field({ type: 'boolean', default: false })
  isStaff: boolean;

  // Reverse relation — no column, just access
  @OneToMany(() => Post, { mappedBy: 'author' })
  posts: Post[];
}
```

## Relations

```typescript
// models/Post.ts
import { Model, Field, ForeignKey } from '@reacto/core';
import type { Id } from '@reacto/core';
import { User } from './User';

@Model()  // → "posts"
export class Post extends Model {
  @Field({ type: 'string', maxLength: 255 })
  title: string;

  @Field({ type: 'text' })
  content: string;

  // One decorator creates:
  //   1. `author_id` column (INTEGER)
  //   2. FOREIGN KEY constraint → users(id)
  //   3. Index on author_id
  @ForeignKey(() => User)
  author: Id<User>;
}
```

Available relation decorators:

| Decorator | Column? | Use case |
|-----------|---------|----------|
| `@ForeignKey(() => Target)` | ✅ `prop_id` | Many-to-one (owns the FK column) |
| `@OneToMany(() => Target, { mappedBy })` | ❌ | Reverse of a ForeignKey |
| `@OneToOne(() => Target, { mappedBy })` | ❌ | Reverse of a one-to-one FK |
| `@ManyToOne(() => Target)` | ✅ `prop_id` | Alias for `@ForeignKey` |

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
