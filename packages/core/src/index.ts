/**
 * @reacto/core — The heart of Reacto
 *
 * Django-style ORM for TypeScript/React applications.
 */
import 'reflect-metadata';

// ─── Types ────────────────────────────────────────────────────────────────────

export type {
  FieldType,
  FieldOptions,
  FieldDefinition,
  ModelMeta,
  ModelClass,
  ModelIndex,
  RelationType,
  RelationOptions,
  RelationDefinition,
  SignalType,
  SignalHandler,
  Validator,
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
  AddForeignKeyOperation,
  DropForeignKeyOperation,
  ColumnDefinition,
  DatabaseConfig,
} from './types.js';

// ─── Model base class ────────────────────────────────────────────────────────

export { Model } from './types.js';

// ─── Decorators ───────────────────────────────────────────────────────────────

export {
  Field,
  ModelDecorator as ModelDecor,
  ForeignKey,
  OneToOne,
  OneToMany,
  ManyToOne,
  Signal,
} from './decorators/index.js';

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

// ─── Storage ──────────────────────────────────────────────────────────────────

export {
  LocalStorage,
  S3Storage,
  setDefaultStorage,
  getDefaultStorage,
} from './storage/index.js';
export type { StoredFile, LocalStorageOptions, S3StorageOptions } from './storage/index.js';

// ─── Signals ──────────────────────────────────────────────────────────────────

export { runSignal, getSignals, clearSignals } from './signals/index.js';

// ─── Validators ───────────────────────────────────────────────────────────────

export {
  required,
  minLength,
  maxLength,
  minValue,
  maxValue,
  email,
  url,
  pattern,
  oneOf,
  integer,
  positive,
  validateModel,
  ValidationError,
} from './validators/index.js';
