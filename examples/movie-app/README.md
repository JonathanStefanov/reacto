# 🎬 CineLog — Movie Tracker

**Django-style Reacto app.** Models, views, routes, tasks are auto-discovered.

## Quick Start

```bash
createdb movieapp
npx tsx examples/movie-app/seed.ts
npx tsx examples/movie-app/server.ts
# → http://localhost:3000
```

**Test:** `cine@example.com` / `password123`

## That's It

```tsx
// server.ts — the entire file
import { createSSRApp } from '@reacto-org/ssr';
createSSRApp({ database: { database: 'movieapp' } });
```

**No manual imports. No registration. Just create files:**

```
movie-app/
├── server.ts              ← That's the whole file
│
├── models/                ← Auto-discovered
│   ├── User.ts
│   ├── Movie.ts
│   └── Review.ts
│
├── views/                 ← Auto-mounted as pages
│   ├── HomePage.tsx       ← GET /
│   ├── MovieDetailPage.tsx ← GET /moviedetailpage
│   ├── LoginPage.tsx      ← GET /loginpage
│   └── ProfilePage.tsx    ← GET /profilepage
│
├── routes/                ← Auto-mounted as handlers
│   └── index.ts           ← POST /auth/login, etc.
│
├── tasks/                 ← Auto-discovered
│   └── email.ts           ← Background email job
│
└── public/                ← Static files
    └── styles.css
```

## Django Comparison

| Django | Reacto | Convention |
|---|---|---|
| `models.py` | `models/*.ts` | Auto-imported, decorators register |
| `views.py` | `views/*.tsx` | `export default serverComponent(...)` |
| `urls.py` | `routes/*.ts` | `export const x = route(...)` |
| `tasks.py` | `tasks/*.ts` | `export const x = task(...)` |
| `manage.py` | `server.ts` | `createSSRApp()` |
| `settings.py` | Config object | Passed to `createSSRApp()` |

## How Views Work

```tsx
// views/HomePage.tsx — export default = auto-mounted at /
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Movie } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie).all();
  return <div>{movies.map(m => <p>{m.title}</p>)}</div>;
});
```

**Naming convention → URL path:**
- `HomePage.tsx` → `/`
- `MovieDetailPage.tsx` → `/moviedetailpage`
- `LoginPage.tsx` → `/loginpage`
- `ProfilePage.tsx` → `/profilepage`

## How Routes Work

```tsx
// routes/auth.ts — export named = auto-mounted
import { route } from '@reacto-org/ssr';

export const login = route('post', '/auth/login', async (req, res) => {
  // handle login
});
```

## Learn More

- [Reacto](https://github.com/JonathanStefanov/reacto)
- [@reacto-org/ssr](https://www.npmjs.com/package/@reacto-org/ssr)
