# Authentication

Built-in JWT and session-based authentication.

## JWT Authentication (API)

### Setup

```typescript
import { authMiddleware, signJwt, verifyJwt } from '@reacto-org/server';

// Sign a token
const token = signJwt({ userId: 1, email: 'john@example.com' });

// Verify a token
const payload = verifyJwt(token);

// Protect routes
app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
```

### Login Flow

```typescript
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await ModelManager.objects(User).filter({ email }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await verifyPassword(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signJwt({ userId: user.id, email: user.email });
  res.json({ token, user: user.toJSON() });
});
```

### Password Hashing

```typescript
import { hashPassword, verifyPassword } from '@reacto-org/server';

// Hash
const hashed = await hashPassword('my-password');

// Verify
const valid = await verifyPassword('my-password', hashed);
```

## Session Authentication (SSR)

### Setup

```typescript
import { createSSRApp } from '@reacto-org/ssr';

const app = await createSSRApp({
  secret: 'my-session-secret',
  maxAge: 7 * 24 * 60 * 60, // 7 days
});
```

### Login/Logout

```typescript
// Login (sets cookie)
app.post('/auth/login', async (req, res) => {
  const user = await authenticate(req.body);
  (req as any).login({
    userId: user.id,
    email: user.email,
    username: user.username,
  });
  res.redirect('/');
});

// Logout (clears cookie)
app.get('/auth/logout', (req, res) => {
  (req as any).logout();
  res.redirect('/');
});
```

### Access User in Server Components

```typescript
export default serverComponent(async (ctx) => {
  if (!ctx.user) {
    return <a href="/login">Login</a>;
  }

  return <div>Welcome, {ctx.user.username}!</div>;
});
```

### Access User in Routes

```typescript
export const profile = route('get', '/api/profile', (req, res) => {
  const session = (req as any).session;
  if (!session) return res.status(401).json({ error: 'Not authenticated' });

  res.json({ user: session });
});
```

## Role-Based Access

```typescript
import { requireRole } from '@reacto-org/server';

// Only admins
app.delete('/api/users/:id', authMiddleware, requireRole('admin'), (req, res) => {
  // Delete user
});
```
