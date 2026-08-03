# 🎬 CineLog — Movie Tracker & Chat

A full-stack movie tracking app built with **Reacto**. Demonstrates both
API-first and SSR (Server-Side Rendering) approaches.

## Two Server Options

### Option A: SSR (Server-Side Rendering)
Server-rendered pages — models/auth used directly, zero client JS for most pages.

```bash
npx tsx examples/movie-app/server-ssr.ts
```

### Option B: API + React Client
REST API + React SPA — full client-side interactivity.

```bash
npx tsx examples/movie-app/server.ts
# In another terminal:
cd examples/movie-app/client && npm run dev
```

## SSR Architecture

The SSR version shows Reacto's killer feature — **use models directly in pages**:

```tsx
// This runs on the server — imports work directly
import { ModelManager } from '@reacto-org/core';
import { Movie } from './models';

// Server component — no API calls, no fetch(), just use the ORM
export const MovieListPage = serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie)
    .filter({ genre: 'Sci-Fi' })
    .cache(60)
    .all();

  return (
    <div>
      {movies.map(m => <MovieCard key={m.id} movie={m} />)}
    </div>
  );
});
```

**Server components:**
- Run ONLY on the server
- Can import and use `@reacto-org/core` directly
- Access `req.user`, `req.session` via `useServerContext()`
- Render to HTML — ship ZERO JavaScript to client

**Client components** (for interactivity):
- Chat (WebSocket)
- Star rating hover effects
- Search with debounce

## Features

| Feature | SSR Version | API Version |
|---|---|---|
| **ORM + Relations** | ✅ Direct imports | ✅ REST endpoints |
| **Auth** | ✅ Cookie sessions | ✅ JWT tokens |
| **WebSocket** | ✅ Chat | ✅ Chat |
| **Search** | ✅ Form submit | ✅ Debounced input |
| **Caching** | ✅ QuerySet.cache() | ✅ QuerySet.cache() |
| **Background Tasks** | ✅ Welcome email | ✅ Welcome email |
| **Admin Dashboard** | ✅ /api/admin | ✅ /admin |
| **Client JS** | Minimal (chat only) | Full React SPA |

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto
npm install
```

### 2. Create the database

```bash
createdb movieapp
# or: psql -c "CREATE DATABASE movieapp;"
```

### 3. Seed data

```bash
npx tsx examples/movie-app/seed.ts
```

**Test accounts:**
- `cine@example.com` / `password123`
- `horror@example.com` / `password123`

### 4. Run

**SSR version:**
```bash
npx tsx examples/movie-app/server-ssr.ts
# Open http://localhost:3000
```

**API + React version:**
```bash
npx tsx examples/movie-app/server.ts
cd examples/movie-app/client && npm run dev
# Open http://localhost:5173
```

## Project Structure

```
examples/movie-app/
├── models.ts              # ORM models (User, Movie, Review, ChatMessage)
├── server-ssr.ts          # SSR server (server components, sessions)
├── server.ts              # API server (REST, JWT, WebSocket)
├── seed.ts                # Database seed script
├── README.md              # This file
└── client/                # React client (for API version)
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── hooks/
        │   ├── useAuth.ts
        │   └── useChat.ts
        └── components/
            ├── Header.tsx
            ├── AuthForm.tsx
            ├── MovieGrid.tsx
            ├── MovieDetail.tsx
            ├── ChatPanel.tsx
            └── WatchedList.tsx
```

## Learn More

- [Reacto on GitHub](https://github.com/JonathanStefanov/reacto)
- [@reacto-org/core on npm](https://www.npmjs.com/package/@reacto-org/core)
- [@reacto-org/server on npm](https://www.npmjs.com/package/@reacto-org/server)
- [@reacto-org/ssr on npm](https://www.npmjs.com/package/@reacto-org/ssr)
