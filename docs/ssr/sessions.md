# Sessions

Cookie-based session authentication for SSR apps.

## Setup

```typescript
import { createSSRApp } from '@reacto-org/ssr';

const app = await createSSRApp({
  secret: process.env.SESSION_SECRET || 'my-secret',
  maxAge: 7 * 24 * 60 * 60, // 7 days (default)
});
```

## How It Works

1. User logs in → server creates session, sets cookie
2. Browser sends cookie on every request
3. Server reads cookie, loads session data
4. Server components access `ctx.user`

## Login

```typescript
// routes/index.ts
export const login = route('post', '/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await ModelManager.objects(User).filter({ email }).first();
  if (!user) return res.redirect('/login?error=Invalid+credentials');

  const bcrypt = await import('bcryptjs');
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.redirect('/login?error=Invalid+credentials');

  // Create session
  (req as any).login({
    userId: user.id,
    email: user.email,
    username: user.username,
  });

  res.redirect('/');
});
```

## Logout

```typescript
export const logout = route('get', '/auth/logout', (req, res) => {
  (req as any).logout();
  res.redirect('/');
});
```

## Access User in Server Components

```tsx
export default serverComponent(async (ctx) => {
  if (ctx.user) {
    return <div>Welcome, {ctx.user.username}!</div>;
  }

  return <a href="/login">Login</a>;
});
```

## Access User in Routes

```typescript
export const profile = route('get', '/api/profile', (req, res) => {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  res.json({ user: session });
});
```

## Session Data

```typescript
interface SessionData {
  userId: number;
  email: string;
  username: string;
  [key: string]: unknown; // Custom data
}
```

## Cookie Options

| Option | Default | Description |
|---|---|---|
| `name` | `reacto_session` | Cookie name |
| `httpOnly` | `true` | Not accessible via JS |
| `secure` | `false` | HTTPS only |
| `sameSite` | `lax` | CSRF protection |
| `maxAge` | 7 days | Session lifetime |

## Security

- Sessions are stored server-side (in-memory by default)
- Cookie only contains session ID (signed)
- Session ID is random + signed with secret
- `httpOnly` prevents XSS access
- `sameSite: 'lax'` prevents CSRF

## Production

For production, use Redis for session storage:

```typescript
// In production, replace in-memory store with Redis
const sessions = new RedisStore({ client: redisClient });
```
