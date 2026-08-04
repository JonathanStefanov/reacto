# Installation

## Requirements

- **Node.js** 20+
- **PostgreSQL** 14+
- **npm** 9+ (or yarn/pnpm)

## Quick Install

```bash
# Create a new project
mkdir my-app && cd my-app
npm init -y

# Install everything
npm install @reacto-org/core @reacto-org/ssr @reacto-org/cli
npm install react react-dom
npm install -D typescript @types/react @types/react-dom
```

## Create Your First Model

```typescript
// models/User.ts
import { Field, Model } from '@reacto-org/core';

@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string' })
  name!: string;

  @Field({ type: 'email', unique: true })
  email!: string;
}
```

```typescript
// models/index.ts
export { User } from './User.js';
```

## Run

```bash
reacto runserver
# → http://localhost:3000
```

**No `server.ts` needed.** The CLI handles everything.

## Packages

Reacto is a monorepo with these packages:

| Package | Description |
|---|---|
| `@reacto-org/core` | ORM, models, fields, migrations, query builder, caching, tasks |
| `@reacto-org/server` | Express server, auth, WebSocket, file uploads, admin |
| `@reacto-org/ssr` | SSR engine, server components, client components |
| `@reacto-org/cli` | CLI tool — `reacto runserver`, `reacto migrate`, etc. |

## TypeScript Config

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "jsx": "react-jsx"
  }
}
```

## Database Setup

```bash
# Create database
createdb myapp

# Or with psql
psql -c "CREATE DATABASE myapp;"
```

Then tell Reacto where to find it:

```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
```

Or in a `.env` file:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp
```

## Verify Installation

```bash
reacto runserver
```

You should see:

```
🎬 Reacto SSR Server

  Models: User
  ✓ Server running at http://localhost:3000
```

## CLI Commands

```bash
reacto runserver          # Start SSR server (zero-config)
reacto migrate            # Apply pending migrations
reacto makemigrations     # Generate migration files
reacto createsuperuser    # Create an admin user
reacto generate model Foo # Scaffold a new model
reacto status             # Show project status
```

All commands work from your project directory — no configuration files needed.
