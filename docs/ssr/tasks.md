# Tasks

Background jobs for SSR apps.

## Defining Tasks

```typescript
// tasks/email.ts
import { task, ModelManager } from '@reacto-org/ssr';
import { User } from '../models/index.js';

export const sendWelcomeEmail = task('sendWelcomeEmail', async (userId: number) => {
  const user = await ModelManager.objects(User).get({ id: userId });
  console.log(`Sending welcome email to ${user.email}...`);
  await new Promise(r => setTimeout(r, 1000));
  console.log(`Email sent to ${user.email}`);
  return { sent: true, email: user.email };
}, { queue: 'emails', retries: 3 });
```

## Task Helper

```typescript
import { task } from '@reacto-org/ssr';

export const myTask = task(name, handler, options);
```

**Parameters:**
- `name`: string — Task name
- `handler`: `(...args) => Promise<any>` — Task function
- `options`: `{ queue?, retries? }` — Optional config

## Using Tasks in Routes

```typescript
// routes/index.ts
import { route, ModelManager } from '@reacto-org/ssr';
import { User } from '../models/index.js';
import { sendWelcomeEmail } from '../tasks/email.js';

export const register = route('post', '/auth/register', async (req, res) => {
  const user = await ModelManager.create(User, req.body);

  // Run in background (non-blocking)
  sendWelcomeEmail.run(user.id);

  res.redirect('/');
});
```

## Task Options

```typescript
task('myTask', handler, {
  queue: 'emails',   // Queue name (default: 'default')
  retries: 3,        // Max retries (default: 3)
});
```

## Running Tasks

```typescript
// Immediate
const job = await sendWelcomeEmail.run(userId);

// Delayed (60 seconds)
const job = await sendWelcomeEmail.delay(60, userId);
```

## Auto-Discovery

Tasks in `tasks/` are auto-discovered:

```
tasks/
├── email.ts     ← sendWelcomeEmail
├── images.ts    ← processImage
└── notifications.ts ← sendNotification
```

No manual registration needed.
