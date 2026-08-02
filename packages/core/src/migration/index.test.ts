import { describe, it, expect } from 'vitest';
import { operationToSql } from './index.js';
import type { MigrationOperation } from '../types.js';

describe('migration/index', () => {
  describe('operationToSql', () => {
    it('generates CREATE TABLE SQL', () => {
      const op: MigrationOperation = {
        type: 'createTable',
        tableName: 'users',
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true, autoIncrement: true },
          { name: 'username', type: 'VARCHAR(150)', nullable: false, unique: true },
          { name: 'email', type: 'VARCHAR(254)', nullable: false },
        ],
      };
      const sql = operationToSql(op);
      expect(sql).toContain('CREATE TABLE "users"');
      expect(sql).toContain('id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY');
      expect(sql).toContain('username VARCHAR(150) UNIQUE NOT NULL');
      expect(sql).toContain('email VARCHAR(254) NOT NULL');
    });

    it('generates DROP TABLE SQL', () => {
      const op: MigrationOperation = {
        type: 'dropTable',
        tableName: 'old_table',
      };
      const sql = operationToSql(op);
      expect(sql).toBe('DROP TABLE IF EXISTS "old_table"');
    });

    it('generates ADD COLUMN SQL', () => {
      const op: MigrationOperation = {
        type: 'addColumn',
        tableName: 'users',
        column: { name: 'age', type: 'INTEGER', nullable: true },
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" ADD COLUMN age INTEGER');
    });

    it('generates DROP COLUMN SQL', () => {
      const op: MigrationOperation = {
        type: 'dropColumn',
        tableName: 'users',
        columnName: 'legacy_field',
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" DROP COLUMN "legacy_field"');
    });

    it('generates ALTER COLUMN SQL for type change', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'age',
        changes: { type: 'BIGINT' },
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" ALTER COLUMN "age" TYPE BIGINT');
    });

    it('generates ALTER COLUMN SQL for nullable change (set not null)', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'email',
        changes: { nullable: false },
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL');
    });

    it('generates ALTER COLUMN SQL for nullable change (drop not null)', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'bio',
        changes: { nullable: true },
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" ALTER COLUMN "bio" DROP NOT NULL');
    });

    it('generates ALTER COLUMN SQL for default change', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'status',
        changes: { default: "'active'" },
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT \'active\'');
    });

    it('returns null for alterColumn with default undefined (no default change)', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'status',
        changes: { default: undefined },
      };
      // default: undefined is treated as 'no change' since the check is !== undefined
      const sql = operationToSql(op);
      expect(sql).toBeNull();
    });

    it('generates ALTER COLUMN SQL for dropping default with null', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'status',
        changes: { default: null as unknown as string },
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT');
    });

    it('generates ALTER COLUMN SQL with multiple changes', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'age',
        changes: { type: 'BIGINT', nullable: false },
      };
      const sql = operationToSql(op);
      expect(sql).toContain('ALTER COLUMN "age" TYPE BIGINT');
      expect(sql).toContain('ALTER COLUMN "age" SET NOT NULL');
    });

    it('returns null for alterColumn with no changes', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'age',
        changes: {},
      };
      const sql = operationToSql(op);
      expect(sql).toBeNull();
    });

    it('generates CREATE INDEX SQL', () => {
      const op: MigrationOperation = {
        type: 'createIndex',
        tableName: 'users',
        indexName: 'idx_users_email',
        columns: ['email'],
      };
      const sql = operationToSql(op);
      expect(sql).toBe('CREATE INDEX "idx_users_email" ON "users" ("email")');
    });

    it('generates CREATE UNIQUE INDEX SQL', () => {
      const op: MigrationOperation = {
        type: 'createIndex',
        tableName: 'users',
        indexName: 'idx_users_email_unique',
        columns: ['email'],
        unique: true,
      };
      const sql = operationToSql(op);
      expect(sql).toBe('CREATE UNIQUE INDEX "idx_users_email_unique" ON "users" ("email")');
    });

    it('generates CREATE INDEX with multiple columns', () => {
      const op: MigrationOperation = {
        type: 'createIndex',
        tableName: 'orders',
        indexName: 'idx_orders_user_status',
        columns: ['user_id', 'status'],
      };
      const sql = operationToSql(op);
      expect(sql).toBe('CREATE INDEX "idx_orders_user_status" ON "orders" ("user_id", "status")');
    });

    it('generates DROP INDEX SQL', () => {
      const op: MigrationOperation = {
        type: 'dropIndex',
        indexName: 'idx_users_email',
      };
      const sql = operationToSql(op);
      expect(sql).toBe('DROP INDEX IF EXISTS "idx_users_email"');
    });

    it('generates RENAME TABLE SQL', () => {
      const op: MigrationOperation = {
        type: 'renameTable',
        oldTableName: 'users',
        newTableName: 'accounts',
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" RENAME TO "accounts"');
    });

    it('generates RENAME COLUMN SQL', () => {
      const op: MigrationOperation = {
        type: 'renameColumn',
        tableName: 'users',
        oldColumnName: 'name',
        newColumnName: 'full_name',
      };
      const sql = operationToSql(op);
      expect(sql).toBe('ALTER TABLE "users" RENAME COLUMN "name" TO "full_name"');
    });

    it('returns null for unknown operation type', () => {
      const op = { type: 'unknownOp' } as unknown as MigrationOperation;
      const sql = operationToSql(op);
      expect(sql).toBeNull();
    });

    it('generates FOREIGN KEY constraint SQL', () => {
      const op: MigrationOperation = {
        type: 'foreignKey',
        tableName: 'posts',
        columnName: 'author_id',
        referenceTable: 'users',
        referenceColumn: 'id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        constraintName: 'fk_posts_author_id',
      };
      const sql = operationToSql(op);
      expect(sql).toBe(
        'ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_author_id" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE'
      );
    });

    it('generates FOREIGN KEY with SET NULL on delete', () => {
      const op: MigrationOperation = {
        type: 'foreignKey',
        tableName: 'posts',
        columnName: 'author_id',
        referenceTable: 'users',
        referenceColumn: 'id',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      };
      const sql = operationToSql(op);
      expect(sql).toContain('ON DELETE SET NULL');
      expect(sql).toContain('fk_posts_author_id');
    });

    it('generates FOREIGN KEY with defaults when not specified', () => {
      const op: MigrationOperation = {
        type: 'foreignKey',
        tableName: 'posts',
        columnName: 'author_id',
        referenceTable: 'users',
        referenceColumn: 'id',
      };
      const sql = operationToSql(op);
      expect(sql).toContain('ON DELETE CASCADE');
      expect(sql).toContain('ON UPDATE CASCADE');
    });
  });
});
