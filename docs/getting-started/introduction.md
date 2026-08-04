# Introduction

**Reacto** is a full-stack TypeScript framework inspired by Django. It provides:

- **Django-style ORM** — Models, fields, relations, migrations, query builder
- **Auto-generated API** — REST endpoints from your models, zero boilerplate
- **SSR (Server-Side Rendering)** — Server components that use models directly
- **WebSocket** — Real-time subscriptions with channel-based pub/sub
- **Authentication** — JWT + session-based auth, built-in
- **File Uploads** — Local + S3 storage with validation
- **Full-text Search** — PostgreSQL tsvector + ILIKE fallback
- **Caching** — In-memory LRU + Redis backend, signal-aware invalidation
- **Background Tasks** — Queue system with retry, backoff, delayed execution
- **Admin Dashboard** — Auto-generated CRUD UI at `/admin`
- **Validators** — Built-in + custom validators for all fields
- **Signals** — Pre/post save/delete lifecycle hooks

## Philosophy

Reacto follows Django's philosophy:

1. **Convention over configuration** — sensible defaults, minimal setup
2. **Batteries included** — everything you need out of the box
3. **Don't repeat yourself** — define models once, get API + admin + SSR
4. **Explicit is better than implicit** — decorators make intent clear

## Comparison with Django

| Django | Reacto |
|---|---|
| `models.py` | `models/*.ts` with decorators |
| `views.py` | `views/*.tsx` with `serverComponent()` |
| `urls.py` | `routes/*.ts` with `route()` |
| `tasks.py` | `tasks/*.ts` with `task()` |
| `manage.py` | `reacto runserver` (CLI) |
| `settings.py` | Env vars (`DATABASE_URL`, `PORT`, `SECRET`) |
| Django Admin | `/admin` auto-generated |
| Django ORM | `ModelManager.objects(Model)` |
| Django Signals | `@Signal('preSave')` |
| Django Migrations | `reacto migrate` |
| Celery | Built-in task queue |
| Channels | Built-in WebSocket |
