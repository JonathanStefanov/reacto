# 🎬 CineLog — Movie Tracker

A **Django-style** movie app built with Reacto SSR.

**Models and auth used DIRECTLY in server components** — no API layer.

## Quick Start

```bash
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto && npm install
createdb movieapp
npx tsx examples/movie-app/seed.ts
npx tsx examples/movie-app/server.ts
# → http://localhost:3000
```

**Test:** `cine@example.com` / `password123`

## Project Structure

```
movie-app/
├── server.ts          # Entry point (like manage.py)
│
├── models/            # Database models (like models.py)
│   ├── User.ts        #   Password hashing via signal
│   ├── Movie.ts       #   Auto-recalc rating via signal
│   ├── Review.ts      #   Rating validation
│   └── ChatMessage.ts
│
├── views/             # Server components (like views.py)
│   ├── HomePage.tsx   #   Movie list + search + filter
│   ├── MovieDetailPage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── ProfilePage.tsx
│
├── routes/            # Form handlers (like urls.py)
│   └── index.ts       #   Auth, reviews, chat API
│
├── tasks/             # Background jobs (like tasks.py)
│   └── email.ts       #   Welcome email
│
├── templates/         # Layout (like templates/)
│   └── Layout.tsx     #   Base HTML layout
│
└── public/            # Static files (like static/)
    ├── styles.css
    └── client.js      #   Chat (WebSocket)
```

## How It Works

```tsx
// views/HomePage.tsx — runs on server, uses ORM directly
export const HomePage = serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie)
    .search(['title', 'director'], ctx.query.search)
    .cache(60)
    .all();

  return (
    <Layout user={ctx.user}>
      {movies.map(m => <MovieCard key={m.id} movie={m} />)}
    </Layout>
  );
});
```

No `fetch()`. No API calls. No token dance. Just use the ORM.

## Learn More

- [Reacto](https://github.com/JonathanStefanov/reacto)
- [@reacto-org/core](https://www.npmjs.com/package/@reacto-org/core)
- [@reacto-org/ssr](https://www.npmjs.com/package/@reacto-org/ssr)
