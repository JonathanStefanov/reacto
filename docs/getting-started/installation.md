# Installation

## Requirements

- **Node.js** 20+
- **PostgreSQL** 14+
- **npm** 9+ (or yarn/pnpm)

## Install

```bash
# Create a new project
mkdir my-app && cd my-app
npm init -y

# Install Reacto
npm install @reacto-org/core @reacto-org/server @reacto-org/ssr

# Install peer dependencies
npm install react react-dom
npm install -D typescript @types/react @types/react-dom
```

## packages (Monorepo)

Reacto is a monorepo with these packages:

| Package | Description |
|---|---|
| `@reacto-org/core` | ORM, models, fields, migrations, query builder, caching, tasks |
| `@reacto-org/server` | Express server, auth, WebSocket, file uploads, admin |
| `@reacto-org/ssr` | SSR engine, server components, client components |
| `@reacto-org/cli` | CLI tool (migrate, seed, generate) |

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

## Verify Installation

```typescript
import { configureDatabase, ModelManager } from '@reacto-org/core';

configureDatabase({
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  user: 'postgres',
  password: 'postgres',
});

console.log('Reacto installed successfully!');
```
