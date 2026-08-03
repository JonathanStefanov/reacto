# Environment Variables

Configuration via environment variables.

## Database

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `reacto` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_SSL` | `false` | Enable SSL |

## Server

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `SESSION_SECRET` | (random) | Session signing secret |
| `SESSION_MAX_AGE` | `604800` | Session lifetime (seconds) |

## Cache

| Variable | Default | Description |
|---|---|---|
| `CACHE_BACKEND` | `memory` | `memory` or `redis` |
| `CACHE_MAX_SIZE` | `1000` | Max cache entries |
| `CACHE_DEFAULT_TTL` | `300` | Default TTL (seconds) |
| `REDIS_URL` | — | Redis connection URL |

## Tasks

| Variable | Default | Description |
|---|---|---|
| `TASK_CONCURRENCY` | `5` | Concurrent tasks per queue |
| `TASK_POLL_INTERVAL` | `1000` | Poll interval (ms) |

## Uploads

| Variable | Default | Description |
|---|---|---|
| `UPLOAD_DIR` | `./uploads` | Upload directory |
| `MAX_FILE_SIZE` | `10485760` | Max file size (10MB) |

## S3 Storage

| Variable | Default | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret key |
| `AWS_REGION` | `us-east-1` | AWS region |
| `S3_BUCKET` | — | S3 bucket name |

## JWT

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | `reacto-secret` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |

## Example .env

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=postgres
DB_PASSWORD=secret

# Server
PORT=3000
NODE_ENV=production
SESSION_SECRET=my-super-secret-key

# Cache
CACHE_BACKEND=redis
REDIS_URL=redis://localhost:6379

# Tasks
TASK_CONCURRENCY=10
```

## Loading .env

```typescript
// server.ts
import 'dotenv/config';

import { createSSRApp } from '@reacto-org/ssr';
await createSSRApp({ ... });
```

Or use `autoConfigure()` which reads from env:

```typescript
import { autoConfigure } from '@reacto-org/core';
autoConfigure(); // Reads DB_HOST, DB_PORT, etc.
```
