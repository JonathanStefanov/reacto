# Quick Start

Get a Reacto app running in under 2 minutes. Like Django's `python manage.py runserver`.

## 1. Create a Project

```bash
mkdir my-app && cd my-app
npm init -y
npm install @reacto-org/core @reacto-org/ssr @reacto-org/cli
npm install react react-dom
npm install -D typescript @types/react @types/react-dom
```

## 2. Define a Model

```typescript
// models/User.ts
import { Field, Model } from '@reacto-org/core';

@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string', maxLength: 100 })
  username!: string;

  @Field({ type: 'email', unique: true })
  email!: string;

  @Field({ type: 'string', maxLength: 255 })
  password!: string;
}
```

```typescript
// models/index.ts
export { User } from './User.js';
```

## 3. Create a View

```tsx
// views/HomePage.tsx
import React from 'react';
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { User } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const users = await ModelManager.objects(User).all();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(u => <li key={u.id}>{u.username}</li>)}</li>
      </ul>
    </div>
  );
});
```

## 4. Run

```bash
reacto runserver
```

That's it. **No `server.ts` needed.** The CLI auto-discovers your models, views, routes, and tasks.

```
🎬 Reacto SSR Server

  Models: User
  View: HomePage → /
  ✓ Server running at http://localhost:3000
```

## Project Structure

```
my-app/
├── models/          # Database models
│   ├── index.ts
│   └── User.ts
├── views/           # Server components (auto-mounted as pages)
│   └── HomePage.tsx # → /
├── routes/          # URL handlers (optional)
│   └── index.ts
├── tasks/           # Background jobs (optional)
│   └── email.ts
└── public/          # Static files
    └── styles.css
```

## What Just Happened?

1. `reacto runserver` starts the SSR server
2. It auto-discovers `models/` and registers them
3. It auto-discovers `views/` and mounts them as routes
4. It auto-discovers `routes/` and `tasks/`
5. Database config comes from `DATABASE_URL` env var (or defaults to localhost)
6. Session, compression, caching — all configured automatically

## Configuration (Optional)

Everything works with zero config. Override via env vars when needed:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# Server
PORT=8080
HOST=0.0.0.0
SECRET=my-session-secret

# SSR features
SSR_STREAMING=true     # Enable streaming SSR
SSR_CACHE_TTL=120      # Cache pages for 2 minutes
SSR_COMPRESS=false     # Disable gzip
```

Or pass flags:

```bash
reacto runserver --port 8080 --streaming --no-cache
```

## Next Steps

- [Models](../core/models.md) — Define database tables
- [Server Components](../ssr/server-components.md) — Build pages with server-side rendering
- [Routes](../ssr/routes.md) — Handle form submissions and API calls
- [Tasks](../core/tasks.md) — Background job processing
- [Deployment](../deployment/render.md) — Deploy to production
