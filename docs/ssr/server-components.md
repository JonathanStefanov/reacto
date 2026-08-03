# Server Components

Components that run on the server, using models directly.

## Creating Server Components

```tsx
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Movie } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie).all();

  return (
    <div>
      {movies.map(m => <p key={m.id}>{m.title}</p>)}
    </div>
  );
}, 'MovieList');
```

## Server Context

The `ctx` parameter provides:

```typescript
interface ServerContext {
  req: Request;           // Express request
  user: {                 // Authenticated user (from session)
    id: number;
    email: string;
    username: string;
  } | null;
  path: string;           // URL path
  query: Record<string, string>;  // Query parameters
  params: Record<string, string>; // Route parameters
  flash: (type: string, msg: string) => void; // Flash messages
}
```

## Using Models Directly

```tsx
export default serverComponent(async (ctx) => {
  // Query models directly — no API calls
  const movies = await ModelManager.objects(Movie)
    .filter({ genre: 'Sci-Fi' })
    .search(['title', 'director'], 'nolan')
    .cache(60)
    .orderBy('-averageRating')
    .paginate(1, 12)
    .all();

  return <MovieGrid movies={movies} />;
});
```

## Auth in Server Components

```tsx
export default serverComponent(async (ctx) => {
  if (!ctx.user) {
    return (
      <div>
        <p>Please <a href="/login">login</a> to continue.</p>
      </div>
    );
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ userId: ctx.user.id })
    .with('movie')
    .all();

  return <ReviewList reviews={reviews} />;
});
```

## Accessing Query Parameters

```tsx
export default serverComponent(async (ctx) => {
  const search = ctx.query.search || '';
  const page = parseInt(ctx.query.page || '1');

  let qs = ModelManager.objects(Movie);
  if (search) qs = qs.search(['title'], search);

  const movies = await qs.paginate(page, 12).all();

  return <MovieList movies={movies} />;
});
```

## Accessing Route Parameters

```tsx
// In views/MovieDetailPage.tsx → URL: /moviedetailpage?id=123
export default serverComponent(async (ctx) => {
  const movieId = parseInt(ctx.query.id);
  const movie = await ModelManager.objects(Movie).get({ id: movieId });

  return <MovieDetail movie={movie} />;
});
```

## Inline Styles

Server components support inline styles:

```tsx
export default serverComponent(async (ctx) => {
  return (
    <div style={{ padding: 24, background: '#0f0f23' }}>
      <h1 style={{ color: '#fff', fontSize: 28 }}>Hello</h1>
    </div>
  );
});
```

## External Stylesheet

Link to a CSS file in the HTML:

```tsx
export default serverComponent(async (ctx) => {
  return (
    <html>
      <head>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <div className="container">...</div>
      </body>
    </html>
  );
});
```
