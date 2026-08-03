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

```typescript
// server.ts — that's it
import { createSSRApp } from '@reacto-org/ssr';
await createSSRApp({ database: { database: 'myapp' } });
```

```tsx
// views/HomePage.tsx — auto-mounted at /
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Movie } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie).all();
  return <div>{movies.map(m => <p key={m.id}>{m.title}</p>)}</div>;
});
```

## Auto-Discovery

The framework auto-discovers:

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
