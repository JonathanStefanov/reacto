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
      const op: MigrationOperation = { type: 'dropTable', tableName: 'old_table' };
      expect(operationToSql(op)).toBe('DROP TABLE IF EXISTS "old_table"');
    });

    it('generates ADD COLUMN SQL', () => {
      const op: MigrationOperation = {
        type: 'addColumn',
        tableName: 'users',
        column: { name: 'age', type: 'INTEGER', nullable: true },
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" ADD COLUMN age INTEGER');
    });

    it('generates DROP COLUMN SQL', () => {
      const op: MigrationOperation = {
        type: 'dropColumn',
        tableName: 'users',
        columnName: 'legacy_field',
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" DROP COLUMN "legacy_field"');
    });

    it('generates ALTER COLUMN SQL for type change', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'age',
        changes: { type: 'BIGINT' },
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" ALTER COLUMN "age" TYPE BIGINT');
    });

    it('generates ALTER COLUMN SQL for nullable change (set not null)', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'email',
        changes: { nullable: false },
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL');
    });

    it('generates ALTER COLUMN SQL for nullable change (drop not null)', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'bio',
        changes: { nullable: true },
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" ALTER COLUMN "bio" DROP NOT NULL');
    });

    it('generates ALTER COLUMN SQL for default change', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'status',
        changes: { default: "'active'" },
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT \'active\'');
    });

    it('returns null for alterColumn with no changes', () => {
      const op: MigrationOperation = {
        type: 'alterColumn',
        tableName: 'users',
        columnName: 'age',
        changes: {},
      };
      expect(operationToSql(op)).toBeNull();
    });

    it('generates CREATE INDEX SQL', () => {
      const op: MigrationOperation = {
        type: 'createIndex',
        tableName: 'users',
        indexName: 'idx_users_email',
        columns: ['email'],
      };
      expect(operationToSql(op)).toBe('CREATE INDEX "idx_users_email" ON "users" ("email")');
    });

    it('generates CREATE UNIQUE INDEX SQL', () => {
      const op: MigrationOperation = {
        type: 'createIndex',
        tableName: 'users',
        indexName: 'idx_users_email_unique',
        columns: ['email'],
        unique: true,
      };
      expect(operationToSql(op)).toBe('CREATE UNIQUE INDEX "idx_users_email_unique" ON "users" ("email")');
    });

    it('generates DROP INDEX SQL', () => {
      const op: MigrationOperation = { type: 'dropIndex', indexName: 'idx_users_email' };
      expect(operationToSql(op)).toBe('DROP INDEX IF EXISTS "idx_users_email"');
    });

    it('generates RENAME TABLE SQL', () => {
      const op: MigrationOperation = {
        type: 'renameTable',
        oldTableName: 'users',
        newTableName: 'accounts',
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" RENAME TO "accounts"');
    });

    it('generates RENAME COLUMN SQL', () => {
      const op: MigrationOperation = {
        type: 'renameColumn',
        tableName: 'users',
        oldColumnName: 'name',
        newColumnName: 'full_name',
      };
      expect(operationToSql(op)).toBe('ALTER TABLE "users" RENAME COLUMN "name" TO "full_name"');
    });

    it('returns null for unknown operation type', () => {
      const op = { type: 'unknownOp' } as unknown as MigrationOperation;
      expect(operationToSql(op)).toBeNull();
    });

    it('generates FOREIGN KEY constraint SQL', () => {
      const op: MigrationOperation = {
        type: 'addForeignKey',
        tableName: 'posts',
        columnName: 'author_id',
        referencesTable: 'users',
        referencesColumn: 'id',
        onDelete: 'CASCADE',
      };
      const sql = operationToSql(op);
      expect(sql).toBe(
        'ALTER TABLE "posts" ADD CONSTRAINT "fk_posts_author_id" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE'
      );
    });

    it('generates FOREIGN KEY with SET NULL on delete', () => {
      const op: MigrationOperation = {
        type: 'addForeignKey',
        tableName: 'posts',
        columnName: 'author_id',
        referencesTable: 'users',
        referencesColumn: 'id',
        onDelete: 'SET NULL',
      };
      const sql = operationToSql(op);
      expect(sql).toContain('ON DELETE SET NULL');
      expect(sql).toContain('fk_posts_author_id');
    });

    it('generates FOREIGN KEY with default CASCADE when not specified', () => {
      const op: MigrationOperation = {
        type: 'addForeignKey',
        tableName: 'posts',
        columnName: 'author_id',
        referencesTable: 'users',
        referencesColumn: 'id',
      };
      const sql = operationToSql(op);
      expect(sql).toContain('ON DELETE CASCADE');
    });
  });
});
