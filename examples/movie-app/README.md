# 🎬 CineLog — Movie Tracker

**Django-style Reacto app.** Models, views, routes, tasks are auto-discovered.

## Quick Start (Local)

```bash
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto && npm install
createdb movieapp
npx tsx examples/movie-app/seed.ts
npx tsx examples/movie-app/server.ts
# → http://localhost:3000
```

**Test:** `cine@example.com` / `password123`

## Deploy to Render

One-click deploy using `render.yaml`:

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect your repo → Render detects `render.yaml` automatically
4. Click **Apply** — creates web service + PostgreSQL database

Or manually:

1. **New Web Service** → connect repo
2. **Build:** `npm install`
3. **Start:** `npx tsx examples/movie-app/server.ts`
4. **Add PostgreSQL** database (free tier)
5. **Env vars:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`

After deploy, seed the database:

```bash
# In Render Shell (or locally with remote DB URL)
npx tsx examples/movie-app/seed.ts
```

## Project Structure

```
movie-app/
├── server.ts              ← That's the whole file
│
├── models/                ← Auto-discovered
│   ├── User.ts            # Password hashing via signal
│   ├── Movie.ts           # Auto-recalc rating
│   ├── Review.ts          # Rating validation
│   └── ChatMessage.ts
│
├── views/                 ← Auto-mounted as pages
│   ├── HomePage.tsx       # GET / (movie list + search)
│   ├── MovieDetailPage.tsx # GET /moviedetailpage?id=
│   ├── LoginPage.tsx      # GET /loginpage
│   ├── RegisterPage.tsx   # GET /registerpage
│   └── ProfilePage.tsx    # GET /profilepage
│
├── routes/                ← Auto-mounted as handlers
│   └── index.ts           # Auth, reviews
│
├── tasks/                 ← Auto-discovered
│   └── email.ts           # Welcome email
│
├── public/                ← Static files
│   ├── styles.css
│   └── client.js
│
├── seed.ts                ← Seed script
├── render.yaml            ← Render deploy config
└── README.md
```

## How It Works

**server.ts — the entire file:**
```tsx
import { createSSRApp } from '@reacto-org/ssr';
await createSSRApp({ database: { database: 'movieapp' } });
```

**views/HomePage.tsx — auto-mounted at `/`:**
```tsx
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Movie } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie).all();
  return <div>{movies.map(m => <p>{m.title}</p>)}</div>;
});
```

**routes/index.ts — auto-mounted:**
```tsx
import { route } from '@reacto-org/ssr';

export const login = route('post', '/auth/login', async (req, res) => {
  // handle login
});
```

No manual imports. No registration. Convention over configuration.

## Django Comparison

| Django | Reacto |
|---|---|
| `models.py` | `models/*.ts` |
| `views.py` | `views/*.tsx` |
| `urls.py` | `routes/*.ts` |
| `tasks.py` | `tasks/*.ts` |
| `manage.py` | `server.ts` |
| `settings.py` | Config object |

## Learn More

- [Reacto](https://github.com/JonathanStefanov/reacto)
- [@reacto-org/ssr](https://www.npmjs.com/package/@reacto-org/ssr)
- [@reacto-org/core](https://www.npmjs.com/package/@reacto-org/core)
