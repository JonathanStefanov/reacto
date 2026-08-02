/**
 * Reacto — Migration system (auto-generate migrations from model changes)
 *
 * Like Django's makemigrations + migrate:
 *   reacto makemigrations   → Generate migration files
 *   reacto migrate          → Apply pending migrations
 *   reacto migrate --fake   → Mark migrations as applied without running
 */
import { query, transaction } from '../database.js';
import { getAllModels } from '../registry.js';
import { fieldToColumn, columnToSql } from '../fields/index.js';
import type {
  Migration,
  MigrationOperation,
  ColumnDefinition,
  ModelClass,
  AddForeignKeyOperation,
} from '../types.js';
import * as crypto from 'crypto';

// ─── Migration Table ──────────────────────────────────────────────────────────

const MIGRATIONS_TABLE = 'reacto_migrations';

export async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getAppliedMigrations(): Promise<string[]> {
  await ensureMigrationsTable();
  const result = await query(
    `SELECT id FROM "${MIGRATIONS_TABLE}" ORDER BY applied_at ASC`
  );
  return result.rows.map((r) => r.id as string);
}

// ─── Migration Generation ─────────────────────────────────────────────────────

export async function generateMigrations(): Promise<Migration[]> {
  const models = getAllModels();
  const migrations: Migration[] = [];

  for (const [, modelClass] of models) {
    const migration = await generateMigrationForModel(modelClass);
    if (migration) {
      migrations.push(migration);
    }
  }

  return migrations;
}

async function generateMigrationForModel(modelClass: ModelClass): Promise<Migration | null> {
  const tableName = modelClass.tableName;
  const operations: MigrationOperation[] = [];

  const tableExists = await checkTableExists(tableName);

  if (!tableExists) {
    // CREATE TABLE
    const columns: ColumnDefinition[] = [];
    for (const [, fieldDef] of modelClass.fields) {
      columns.push(fieldToColumn(fieldDef));
    }

    operations.push({
      type: 'createTable',
      tableName,
      columns,
    });

    // Add foreign key constraints
    for (const [, rel] of modelClass.relations) {
      if (rel.type === 'foreignKey' || rel.type === 'oneToOne') {
        const targetClass = rel.target();
        operations.push({
          type: 'addForeignKey',
          tableName,
          columnName: rel.foreignKey,
          referencesTable: targetClass.tableName,
          referencesColumn: 'id',
          onDelete: rel.onDelete ?? 'CASCADE',
        } as AddForeignKeyOperation);
      }
    }

    // Add indexes
    if (modelClass.meta.indexes) {
      for (const idx of modelClass.meta.indexes) {
        operations.push({
          type: 'createIndex',
          tableName,
          indexName: idx.name ?? `idx_${tableName}_${idx.fields.join('_')}`,
          columns: idx.fields,
          unique: idx.unique,
        });
      }
    }
  } else {
    // Compare columns
    const existingColumns = await getTableColumns(tableName);
    const existingColumnNames = new Set(existingColumns.keys());

    for (const [, fieldDef] of modelClass.fields) {
      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      const columnDef = fieldToColumn(fieldDef);

      if (!existingColumnNames.has(dbColumn)) {
        operations.push({
          type: 'addColumn',
          tableName,
          column: columnDef,
        });
      }
    }
  }

  if (operations.length === 0) return null;

  const id = generateMigrationId();
  const name = `auto_${tableName}_${Date.now()}`;

  return { id, name, operations, dependencies: [], createdAt: new Date() };
}

// ─── Migration Execution ──────────────────────────────────────────────────────

export async function applyMigrations(migrations: Migration[]): Promise<void> {
  await ensureMigrationsTable();
  const applied = new Set(await getAppliedMigrations());

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;

    console.log(`[Reacto] Applying migration: ${migration.name}`);

    await transaction(async (client) => {
      for (const op of migration.operations) {
        const sql = operationToSql(op);
        if (sql) await client.query(sql);
      }
      await client.query(
        `INSERT INTO "${MIGRATIONS_TABLE}" (id, name) VALUES ($1, $2)`,
        [migration.id, migration.name]
      );
    });

    console.log(`[Reacto] ✓ Applied: ${migration.name}`);
  }
}

export async function fakeMigrations(migrations: Migration[]): Promise<void> {
  await ensureMigrationsTable();
  const applied = new Set(await getAppliedMigrations());

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    await query(
      `INSERT INTO "${MIGRATIONS_TABLE}" (id, name) VALUES ($1, $2)`,
      [migration.id, migration.name]
    );
    console.log(`[Reacto] ✓ Faked: ${migration.name}`);
  }
}

export async function showMigrationStatus(migrations: Migration[]): Promise<void> {
  const applied = new Set(await getAppliedMigrations());
  console.log('\n[Reacto] Migration Status:\n');
  for (const migration of migrations) {
    const status = applied.has(migration.id) ? '✓ Applied' : '○ Pending';
    console.log(`  ${status}  ${migration.name}`);
  }
  console.log('');
}

// ─── SQL Generation ───────────────────────────────────────────────────────────

export function operationToSql(op: MigrationOperation): string | null {
  switch (op.type) {
    case 'createTable': {
      const columnDefs = op.columns.map(columnToSql).join(',\n  ');
      return `CREATE TABLE "${op.tableName}" (\n  ${columnDefs}\n)`;
    }

    case 'dropTable':
      return `DROP TABLE IF EXISTS "${op.tableName}"`;

    case 'addColumn':
      return `ALTER TABLE "${op.tableName}" ADD COLUMN ${columnToSql(op.column)}`;

    case 'dropColumn':
      return `ALTER TABLE "${op.tableName}" DROP COLUMN "${op.columnName}"`;

    case 'alterColumn': {
      const parts: string[] = [];
      if (op.changes.type) {
        parts.push(`ALTER COLUMN "${op.columnName}" TYPE ${op.changes.type}`);
      }
      if (op.changes.nullable !== undefined) {
        parts.push(
          op.changes.nullable
            ? `ALTER COLUMN "${op.columnName}" DROP NOT NULL`
            : `ALTER COLUMN "${op.columnName}" SET NOT NULL`
        );
      }
      if (op.changes.default !== undefined) {
        parts.push(
          op.changes.default
            ? `ALTER COLUMN "${op.columnName}" SET DEFAULT ${op.changes.default}`
            : `ALTER COLUMN "${op.columnName}" DROP DEFAULT`
        );
      }
      if (parts.length === 0) return null;
      return `ALTER TABLE "${op.tableName}" ${parts.join(', ')}`;
    }

    case 'createIndex': {
      const unique = op.unique ? 'UNIQUE ' : '';
      return `CREATE ${unique}INDEX "${op.indexName}" ON "${op.tableName}" (${op.columns.map((c) => `"${c}"`).join(', ')})`;
    }

    case 'dropIndex':
      return `DROP INDEX IF EXISTS "${op.indexName}"`;

    case 'renameTable':
      return `ALTER TABLE "${op.oldTableName}" RENAME TO "${op.newTableName}"`;

    case 'renameColumn':
      return `ALTER TABLE "${op.tableName}" RENAME COLUMN "${op.oldColumnName}" TO "${op.newColumnName}"`;

    case 'addForeignKey': {
      const constraintName = `fk_${op.tableName}_${op.columnName}`;
      return `ALTER TABLE "${op.tableName}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("${op.columnName}") REFERENCES "${op.referencesTable}" ("${op.referencesColumn}") ON DELETE ${op.onDelete ?? 'CASCADE'}`;
    }

    case 'dropForeignKey':
      return `ALTER TABLE "${op.tableName}" DROP CONSTRAINT "${op.constraintName}"`;

    default:
      return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0]?.exists === true;
}

async function getTableColumns(tableName: string): Promise<Map<string, { type: string; nullable: boolean }>> {
  const result = await query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );

  const columns = new Map<string, { type: string; nullable: boolean }>();
  for (const row of result.rows) {
    columns.set(row.column_name as string, {
      type: row.data_type as string,
      nullable: row.is_nullable === 'YES',
    });
  }
  return columns;
}

function generateMigrationId(): string {
  return crypto.randomBytes(6).toString('hex');
}
