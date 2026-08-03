# Migrations

Manage database schema changes with migrations.

## CLI Commands

```bash
# Generate migrations from model changes
npx reacto makemigrations

# Apply pending migrations
npx reacto migrate

# Show migration status
npx reacto status

# Fake migrations (mark as applied without running)
npx reacto migrate --fake
```

## How It Works

1. Reacto compares your models to the current database schema
2. Generates migration files in `migrations/`
3. Applies migrations in order

## Migration Files

```typescript
// migrations/001_create_users.ts
import { Migration } from '@reacto-org/core';

export const migration: Migration = {
  id: '001',
  name: 'create_users',
  operations: [
    {
      type: 'createTable',
      tableName: 'users',
      columns: [
        { name: 'id', type: 'SERIAL', primaryKey: true },
        { name: 'username', type: 'VARCHAR(100)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', unique: true },
        { name: 'created_at', type: 'TIMESTAMP', default: 'NOW()' },
      ],
    },
  ],
  dependencies: [],
  createdAt: new Date(),
};
```

## Auto-Generated Migrations

When you change a model, Reacto detects:

- New fields → `addColumn`
- Removed fields → `dropColumn`
- Changed types → `alterColumn`
- New indexes → `createIndex`
- New tables → `createTable`
- Dropped tables → `dropTable`

## Programmatic API

```typescript
import {
  generateMigrations,
  applyMigrations,
  showMigrationStatus,
} from '@reacto-org/core';

// Generate
const migrations = await generateMigrations();

// Apply
await applyMigrations();

// Status
const status = await showMigrationStatus();
```
