# Routes

URL handlers for form submissions and API endpoints.

## Defining Routes

```typescript
// routes/index.ts
import { route, ModelManager } from '@reacto-org/ssr';
import { User } from '../models/index.js';

export const login = route('post', '/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await ModelManager.objects(User).filter({ email }).first();
  if (!user) return res.redirect('/login?error=Invalid+credentials');

  const bcrypt = await import('bcryptjs');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.redirect('/login?error=Invalid+credentials');

  (req as any).login({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  res.redirect('/');
});
```

## Route Helper

```typescript
import { route } from '@reacto-org/ssr';

export const myRoute = route(method, path, handler);
```

**Parameters:**
- `method`: `'get'` | `'post'` | `'put'` | `'delete'`
- `path`: URL path string
- `handler`: `(req: Request, res: Response) => Promise<void> | void`

## Multiple Routes

```typescript
// routes/index.ts
export const login = route('post', '/auth/login', async (req, res) => { ... });
export const register = route('post', '/auth/register', async (req, res) => { ... });
export const logout = route('get', '/auth/logout', (req, res) => { ... });
export const createReview = route('post', '/api/reviews', async (req, res) => { ... });
```

## Form Handling

```tsx
// views/LoginPage.tsx
export default serverComponent(async (ctx) => {
  return (
    <form method="POST" action="/auth/login">
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      <button type="submit">Login</button>
    </form>
  );
});
```

```typescript
// routes/index.ts
export const login = route('post', '/auth/login', async (req, res) => {
  const { email, password } = req.body;
  // ... authenticate
  res.redirect('/');
});
```

## API Routes

```typescript
export const getMovies = route('get', '/api/movies', async (req, res) => {
  const movies = await ModelManager.objects(Movie).all();
  res.json({ data: movies.map(m => m.toJSON()) });
});

export const createMovie = route('post', '/api/movies', async (req, res) => {
  const movie = await ModelManager.create(Movie, req.body);
  res.json({ data: movie.toJSON() });
});
```

## Session Access

```typescript
export const profile = route('get', '/api/profile', (req, res) => {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  res.json({ user: session });
});
```

## Redirects

```typescript
// Redirect after form submission
res.redirect('/');

// Redirect with error
res.redirect('/login?error=Invalid+credentials');

// Redirect with encoded error
res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
```
