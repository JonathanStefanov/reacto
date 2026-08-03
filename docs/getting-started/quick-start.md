# Quick Start

## 1. Create Project Structure

```
my-app/
├── server.ts
├── models/
│   ├── index.ts
│   └── User.ts
├── views/
│   └── HomePage.tsx
├── routes/
│   └── index.ts
├── public/
│   └── styles.css
└── seed.ts
```

## 2. Define a Model

```typescript
// models/User.ts
import { Field, Model } from '@reacto-org/core';

@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string', maxLength: 100 })
  username!: string;

  @Field({ type: 'email', unique: true })
  email!: string;

  @Field({ type: 'string', maxLength: 255 })
  password!: string;
}
```

## 3. Create a Server Component

```tsx
// views/HomePage.tsx
import React from 'react';
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { User } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const users = await ModelManager.objects(User).all();

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map(u => <li key={u.id}>{u.username}</li>)}
      </ul>
    </div>
  );
});
```

## 4. Create the Server

```typescript
// server.ts
import { createSSRApp } from '@reacto-org/ssr';
import './models/index.js';

await createSSRApp({
  database: { database: 'myapp' },
  port: 3000,
});
```

## 5. Run

```bash
npx tsx server.ts
# → http://localhost:3000
```

That's it! The framework auto-discovers your models and views.
