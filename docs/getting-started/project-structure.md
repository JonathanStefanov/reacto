# Project Structure

Reacto follows Django's project structure convention.

## Standard Layout

```
my-app/
├── server.ts              # Entry point (like manage.py)
│
├── models/                # Database models (like models.py)
│   ├── index.ts           # Barrel export
│   ├── User.ts
│   ├── Post.ts
│   └── Comment.ts
│
├── views/                 # Server components (like views.py)
│   ├── HomePage.tsx       # Auto-mounted at /
│   ├── PostDetailPage.tsx # Auto-mounted at /postdetailpage
│   └── LoginPage.tsx      # Auto-mounted at /loginpage
│
├── routes/                # URL handlers (like urls.py)
│   └── index.ts           # Auth, form handlers, API
│
├── tasks/                 # Background jobs (like tasks.py + Celery)
│   └── email.ts
│
├── templates/             # Layout components (optional)
│   └── Layout.tsx
│
├── middleware/             # Request middleware (optional)
│   └── auth.ts
│
├── public/                # Static files (like static/)
│   ├── styles.css
│   └── client.js
│
├── seed.ts                # Database seed script
└── README.md
```

## Convention over Configuration

### Models (`models/`)

Auto-imported. Decorators register models automatically.

```typescript
// models/User.ts
@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string' })
  name!: string;
}
```

### Views (`views/`)

Auto-mounted as pages. Export a `serverComponent` as default.

```typescript
// views/HomePage.tsx → mounted at /
// views/LoginPage.tsx → mounted at /loginpage
// views/PostDetailPage.tsx → mounted at /postdetailpage

export default serverComponent(async (ctx) => {
  return <div>Hello</div>;
});
```

**Naming convention:**
- `HomePage.tsx` → `/`
- `LoginPage.tsx` → `/loginpage`
- `PostDetailPage.tsx` → `/postdetailpage`

### Routes (`routes/`)

Auto-mounted. Export `route()` definitions.

```typescript
// routes/index.ts
export const login = route('post', '/auth/login', async (req, res) => {
  // handle login
});
```

### Tasks (`tasks/`)

Auto-registered. Export `task()` definitions.

```typescript
// tasks/email.ts
export const sendEmail = task('sendEmail', async (userId: number) => {
  // send email
}, { queue: 'emails', retries: 3 });
```
