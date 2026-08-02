/**
 * @reacto/core — The heart of Reacto
 *
 * Django-style ORM for TypeScript/React applications.
 *
 * @example
 * ```ts
 * import { Model, Field, configureDatabase, ModelManager } from '@reacto/core';
 *
 * // Configure database
 * configureDatabase({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'myapp',
 *   user: 'postgres',
 *   password: 'secret',
 * });
 *
 * // Define a model
 * @Model({ tableName: 'users' })
 * class User extends Model {
 *   @Field({ type: 'string', maxLength: 150, unique: true })
 *   username: string;
 *
 *   @Field({ type: 'email' })
 *   email: string;
 *
 *   @Field({ type: 'boolean', default: false })
 *   isActive: boolean;
 * }
 *
 * // Create
 * const user = await ModelManager.create(User, { username: 'john', email: 'john@example.com' });
 *
 * // Query
 * const users = await ModelManager.objects(User).filter({ isActive: true }).all();
 * const user = await ModelManager.objects(User).get({ id: 1 });
 * ```
 */
import 'reflect-metadata';

// ─── Core exports ─────────────────────────────────────────────────────────────

export type {
  FieldType,
  FieldOptions,
  FieldDefinition,
  ModelMeta,
  ModelClass,
  ModelIndex,
  WhereClause,
  WhereOperator,
  OrderClause,
  OrderDirection,
  QueryOptions,
  AggregateOptions,
  AggregateResult,
  Migration,
  MigrationOperation,
  CreateTableOperation,
  DropTableOperation,
  AddColumnOperation,
  DropColumnOperation,
  AlterColumnOperation,
  CreateIndexOperation,
  DropIndexOperation,
  RenameTableOperation,
  RenameColumnOperation,
  ColumnDefinition,
  DatabaseConfig,
} from './types.js';

// ─── Decorators ───────────────────────────────────────────────────────────────

export { Field, ModelDecorator as Model } from './decorators/index.js';

// ─── Database ─────────────────────────────────────────────────────────────────

export {
  configureDatabase,
  getPool,
  getClient,
  query,
  transaction,
  closePool,
  parseDatabaseUrl,
  autoConfigure,
} from './database.js';

// ─── Model Manager & QuerySet ─────────────────────────────────────────────────

export { ModelManager, QuerySet } from './model.js';

// ─── Registry ─────────────────────────────────────────────────────────────────

export {
  registerModel,
  getModel,
  getAllModels,
  getModelList,
  hasModel,
  clearRegistry,
} from './registry.js';

// ─── Query Builder ────────────────────────────────────────────────────────────

export { QueryBuilder, qb } from './query/index.js';

// ─── Migrations ───────────────────────────────────────────────────────────────

export {
  ensureMigrationsTable,
  getAppliedMigrations,
  generateMigrations,
  applyMigrations,
  fakeMigrations,
  showMigrationStatus,
  operationToSql,
} from './migration/index.js';

// ─── Fields ───────────────────────────────────────────────────────────────────

export { fieldTypeToPgType, fieldToColumn, columnToSql } from './fields/index.js';
