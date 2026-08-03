# 🎬 CineLog — Movie Tracker

A **server-rendered** movie tracking app built with Reacto's SSR engine.

**Models and auth used DIRECTLY in pages** — no API layer, no fetch(),
no token dance. Just import `ModelManager` and use it.

## Quick Start

```bash
# 1. Install
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto && npm install

# 2. Database
createdb movieapp

# 3. Seed data
npx tsx examples/movie-app/seed.ts

# 4. Run
npx tsx examples/movie-app/server.ts

# 5. Open http://localhost:3000
```

**Test accounts:**
- `cine@example.com` / `password123`
- `horror@example.com` / `password123`

## How It Works

This is the Reacto way — **server components that use models directly**:

```tsx
// This runs on the server. No API calls. Just use the ORM.
const HomePage = serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie)
    .filter({ genre: ctx.query.genre })
    .cache(60)
    .all();

  return (
    <div>
      {movies.map(m => <MovieCard key={m.id} movie={m} />)}
    </div>
  );
});
```

**Auth works directly too:**
```tsx
const ProfilePage = serverComponent(async (ctx) => {
  if (!ctx.user) return <Redirect to="/login" />;

  const reviews = await ModelManager.objects(Review)
    .filter({ userId: ctx.user.id })
    .with('movie')
    .all();

  return <WatchedList reviews={reviews} />;
});
```

## Architecture

```
Server-rendered (zero client JS):
├── Movie list — search, filter, pagination
├── Movie detail — info, reviews, rating form
├── Login / Register — form-based auth
├── Profile — watched movies
└── Admin — /api/admin

Client-side (minimal JS for interactivity):
├── Chat — WebSocket real-time messaging
├── Navigation — auth-aware navbar
└── Star rating — hover effects
```

## Pages

| URL | Description |
|---|---|
| `/` | Movie list with search, genre filter, pagination |
| `/movies/:id` | Movie detail + reviews + review form |
| `/login` | Login (cookie session) |
| `/register` | Register (triggers welcome email) |
| `/profile` | Watched movies (protected) |
| `/api/admin` | Admin dashboard |

## Project Structure

```
examples/movie-app/
├── server.ts          # SSR server (main entry point)
├── server-api.ts      # API + React client version (alternative)
├── models.ts          # ORM models
├── seed.ts            # Seed script (4 users, 10 movies, 15 reviews)
├── public/
│   ├── styles.css     # Dark theme styles
│   └── client.js      # Minimal client JS (chat, nav, star rating)
├── client/            # React client (for API version only)
└── README.md
```

## SSR vs API Version

| Feature | SSR (`server.ts`) | API (`server-api.ts`) |
|---|---|---|
| Auth | Cookie sessions | JWT tokens |
| Data loading | Server components | REST API + fetch() |
| Client JS | ~6KB (chat only) | ~50KB+ (full React) |
| Interactivity | Chat + star rating | Everything |
| How to run | `npx tsx server.ts` | `npx tsx server-api.ts` + `npm run dev` |

## Learn More

- [Reacto on GitHub](https://github.com/JonathanStefanov/reacto)
- [@reacto-org/ssr](https://www.npmjs.com/package/@reacto-org/ssr)
- [@reacto-org/core](https://www.npmjs.com/package/@reacto-org/core)
- [@reacto-org/server](https://www.npmjs.com/package/@reacto-org/server)
