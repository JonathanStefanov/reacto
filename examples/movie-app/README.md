# 🎬 CineLog — Movie Tracker

A **Django-style** movie tracking app built with Reacto.

Server-rendered pages using models and auth **directly** — no API layer.

## Project Structure

```
movie-app/
├── server.ts          # Entry point — configures and starts the app
│
├── models/            # Database models (like Django's models.py)
│   ├── index.ts       #   Barrel export
│   ├── User.ts        #   User model with password hashing
│   ├── Movie.ts       #   Movie model with rating signal
│   ├── Review.ts      #   Review model with validation
│   └── ChatMessage.ts #   Chat message model
│
├── views/             # Server components (like Django's views.py)
│   ├── index.ts       #   Barrel export
│   ├── HomePage.tsx   #   Movie list with search/filter
│   ├── MovieDetailPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── ProfilePage.tsx
│
├── routes/            # URL routing + form handlers (like Django's urls.py)
│   └── index.ts       #   Auth routes, review submission, chat API
│
├── tasks/             # Background jobs (like Django's tasks.py + Celery)
│   └── email.ts       #   Welcome email task
│
├── templates/         # Layout components (like Django's templates/)
│   └── Layout.tsx     #   Base HTML layout
│
├── middleware/         # Request middleware (like Django's middleware/)
│   └── (reserved)
│
├── public/            # Static files (like Django's STATIC_ROOT)
│   ├── styles.css     #   Dark theme styles
│   └── client.js      #   Minimal client JS (nav, star hover)
│
├── seed.ts            # Database seed script
└── README.md          # This file
```

## Quick Start

```bash
# 1. Install
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto && npm install

# 2. Database
createdb movieapp

# 3. Seed
npx tsx examples/movie-app/seed.ts

# 4. Run
npx tsx examples/movie-app/server.ts

# 5. Open http://localhost:3000
```

**Test accounts:** `cine@example.com` / `password123`

## Django Comparison

| Django | Reacto | File |
|---|---|---|
| `models.py` | `models/` | Model definitions with fields, relations, signals |
| `views.py` | `views/` | Server components that use models directly |
| `urls.py` | `routes/` | URL routing and form handlers |
| `tasks.py` | `tasks/` | Background jobs (email, processing) |
| `templates/` | `templates/` | Layout components |
| `middleware/` | `middleware/` | Request middleware |
| `static/` | `public/` | CSS, JS, images |
| `manage.py` | `server.ts` | Entry point |
| `django-admin startproject` | `reacto init` | Project scaffolding (coming soon) |

## How It Works

**Server components use models directly — no API calls:**

```tsx
// views/HomePage.tsx
import { ModelManager } from '@reacto-org/core';
import { Movie } from '../models/index.js';

export const HomePage = serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie)
    .search(['title', 'director'], ctx.query.search)
    .cache(60)
    .all();

  return <MovieGrid movies={movies} />;
});
```

**Auth works via sessions — no token dance:**

```tsx
export const ProfilePage = serverComponent(async (ctx) => {
  if (!ctx.user) return <Redirect to="/login" />;

  const reviews = await ModelManager.objects(Review)
    .filter({ userId: ctx.user.id })
    .with('movie')
    .all();

  return <WatchedList reviews={reviews} />;
});
```

## Learn More

- [Reacto on GitHub](https://github.com/JonathanStefanov/reacto)
- [@reacto-org/core](https://www.npmjs.com/package/@reacto-org/core)
- [@reacto-org/ssr](https://www.npmjs.com/package/@reacto-org/ssr)
