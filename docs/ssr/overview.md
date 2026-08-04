# SSR Overview

Server-Side Rendering with Reacto. Django-style server components that use models directly.

## What is SSR?

SSR renders React components on the server and sends HTML to the browser. No React bundle for most pages — just HTML.

```
Browser requests /movies
       ↓
Server runs MovieListPage() ← uses ModelManager directly
       ↓
Models queried, HTML rendered
       ↓
Full HTML sent to browser ← no React bundle, no API calls
       ↓
Browser displays page ← ~3KB client JS for chat only
```

## Why SSR?

| Feature | SSR | Client SPA |
|---|---|---|
| Initial load | Fast (HTML) | Slow (JS bundle) |
| SEO | Perfect | Needs setup |
| Data loading | Server (direct) | API calls |
| Auth | Sessions (cookies) | JWT tokens |
| Client JS | Minimal | Full React |
| Complexity | Simple | Complex |

## Quick Start

```bash
reacto runserver
```

That's it. No `server.ts` needed. The CLI auto-discovers everything.

### Define a model

```typescript
// models/Movie.ts
import { Field, Model } from '@reacto-org/core';

@Model({ tableName: 'movies' })
export class Movie {
  @Field({ type: 'string' })
  title!: string;

  @Field({ type: 'string' })
  director!: string;

  @Field({ type: 'number' })
  year!: number;
}
```

### Create a view

```tsx
// views/HomePage.tsx — auto-mounted at /
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Movie } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie).all();
  return <div>{movies.map(m => <p key={m.id}>{m.title}</p>)}</div>;
});
```

### Run

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
reacto runserver
# → http://localhost:3000
```

## Auto-Discovery

The CLI auto-discovers everything from your project directory:

| Directory | Convention | Example |
|---|---|---|
| `models/` | Import all | Auto-registered |
| `views/` | `export default serverComponent(...)` | Auto-mounted as page |
| `routes/` | `export const x = route(...)` | Auto-mounted as handler |
| `tasks/` | `export const x = task(...)` | Auto-registered |

## View Naming → URL

| File | URL |
|---|---|
| `HomePage.tsx` | `/` |
| `LoginPage.tsx` | `/loginpage` |
| `MovieDetailPage.tsx` | `/moviedetailpage` |
| `ProfilePage.tsx` | `/profilepage` |

## Configuration

Zero config by default. Override via env vars:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp  # Database
PORT=8080                                                  # Server port
HOST=0.0.0.0                                               # Bind address
SECRET=my-secret-key                                       # Session secret
SSR_STREAMING=true                                         # Streaming SSR
SSR_CACHE_TTL=120                                          # Cache TTL (seconds)
SSR_COMPRESS=false                                         # Disable gzip
```

Or CLI flags:

```bash
reacto runserver --port 8080 --streaming --no-cache --no-compress
```

## Performance

Built-in performance features (all enabled by default):

| Feature | What it does | Default |
|---|---|---|
| **Compression** | gzip/deflate for responses > 1KB | ON |
| **ETag** | 304 Not Modified for cached pages | ON |
| **Response Cache** | LRU cache with configurable TTL | ON, 60s |
| **Session Limit** | Max 50K sessions, LRU eviction | ON |
| **Streaming SSR** | `renderToPipeableStream` for TTFB | OFF (opt-in) |

Cache stats endpoint: `GET /api/_ssr/cache-stats`
