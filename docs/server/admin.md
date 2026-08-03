# Admin Dashboard

Auto-generated CRUD UI for all models.

## Accessing the Admin

The admin is available at `/admin` (or `/api/admin` in SSR mode).

```
http://localhost:3000/admin
```

## Features

- **Auto-discovery** — all registered models appear in the sidebar
- **List view** — paginated table with all fields
- **Create** — form with validation
- **Edit** — update existing records
- **Delete** — with confirmation
- **Detail view** — all fields displayed

## Admin API

### Model Metadata

```bash
GET /api/_admin/meta
```

Returns metadata for all models:

```json
{
  "models": [
    {
      "name": "User",
      "tableName": "users",
      "fields": [
        { "name": "id", "type": "integer", "primaryKey": true },
        { "name": "username", "type": "string", "maxLength": 100 },
        { "name": "email", "type": "email", "unique": true }
      ],
      "relations": [],
      "fieldCount": 5
    }
  ],
  "count": 1
}
```

### Single Model Metadata

```bash
GET /api/_admin/meta/User
```

### Health Check

```bash
GET /api/_admin/health
```

```json
{
  "status": "ok",
  "models": ["User", "Post", "Comment"],
  "modelCount": 3
}
```

## Disabling Admin

```typescript
const { app } = createServer({
  admin: false,
});
```

## Task Monitoring

Background tasks are monitored at `/api/_admin/tasks`:

```bash
GET /api/_admin/tasks          # List all jobs
GET /api/_admin/tasks/stats    # Queue statistics
GET /api/_admin/tasks/:id      # Job status
POST /api/_admin/tasks/:id/cancel  # Cancel a job
```
