/**
 * Reacto Core — Type definitions
 */

// ─── Validator Interface ──────────────────────────────────────────────────────

export interface Validator {
  name: string;
  validate: (value: unknown, fieldName: string) => string | null;
}

// ─── Field Types ──────────────────────────────────────────────────────────────

export type FieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigInteger'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'uuid'
  | 'email'
  | 'url'
  | 'file'
  | 'image';

export interface FieldOptions {
  type: FieldType;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  nullable?: boolean;
  default?: unknown;
  maxLength?: number;
  precision?: number;
  scale?: number;
  index?: boolean;
  email?: boolean;
  url?: boolean;
  choices?: Record<string, unknown> | unknown[];
  verboseName?: string;
  helpText?: string;
  dbColumn?: string;
  validators?: Validator[];
  // File options
  uploadTo?: string | ((instance: unknown) => string);
  allowedMimeTypes?: string[];
  maxFileSize?: number; // bytes
}

export interface FieldDefinition extends FieldOptions {
  name: string;
  propertyKey: string;
}

// ─── Relation Types ───────────────────────────────────────────────────────────

export type RelationType = 'foreignKey' | 'oneToMany' | 'oneToOne' | 'manyToMany';

export interface RelationOptions {
  type: RelationType;
  target: () => ModelClass;
  inverseSide?: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  nullable?: boolean;
  joinTable?: string; // for manyToMany
}

export interface RelationDefinition extends RelationOptions {
  propertyKey: string;
  foreignKey: string;
}

// ─── Signal Types (Lifecycle Hooks) ──────────────────────────────────────────

export type SignalType = 'preSave' | 'postSave' | 'preDelete' | 'postDelete';

export type SignalHandler<T extends Model = Model> = (instance: T) => void | Promise<void>;

// ─── Model Types ──────────────────────────────────────────────────────────────

export interface ModelMeta {
  tableName: string;
  ordering?: string[];
  uniqueTogether?: string[][];
  indexes?: ModelIndex[];
  verboseName?: string;
  verboseNamePlural?: string;
}

export interface ModelIndex {
  name?: string;
  fields: string[];
  unique?: boolean;
  condition?: string;
}

export type ModelClass<T extends Model = Model> = {
  new (...args: unknown[]): T;
  meta: ModelMeta;
  tableName: string;
  fields: Map<string, FieldDefinition>;
  relations: Map<string, RelationDefinition>;
  signals: Map<SignalType, SignalHandler[]>;
  _modelName: string;
};

// ─── Query Types ──────────────────────────────────────────────────────────────

export type WhereOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'like'
  | 'ilike'
  | 'isNull'
  | 'isNotNull'
  | 'between';

export interface WhereClause {
  field: string;
  operator: WhereOperator;
  value: unknown;
}

export type OrderDirection = 'ASC' | 'DESC';

export interface OrderClause {
  field: string;
  direction: OrderDirection;
}

export interface QueryOptions {
  where?: WhereClause[];
  orderBy?: OrderClause[];
  limit?: number;
  offset?: number;
  select?: string[];
  relations?: string[];
  search?: SearchClause;
}

export interface SearchClause {
  fields: string[];
  query: string;
  /** Use PostgreSQL full-text search. Default: false (uses ILIKE) */
  fullText?: boolean;
}

export interface AggregateOptions {
  field?: string;
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  groupBy?: string[];
}

export interface AggregateResult {
  [key: string]: unknown;
}

// ─── Migration Types ──────────────────────────────────────────────────────────

export type MigrationOperation =
  | CreateTableOperation
  | DropTableOperation
  | AddColumnOperation
  | DropColumnOperation
  | AlterColumnOperation
  | CreateIndexOperation
  | DropIndexOperation
  | RenameTableOperation
  | RenameColumnOperation
  | AddForeignKeyOperation
  | DropForeignKeyOperation;

export interface CreateTableOperation {
  type: 'createTable';
  tableName: string;
  columns: ColumnDefinition[];
}

export interface DropTableOperation {
  type: 'dropTable';
  tableName: string;
}

export interface AddColumnOperation {
  type: 'addColumn';
  tableName: string;
  column: ColumnDefinition;
}

export interface DropColumnOperation {
  type: 'dropColumn';
  tableName: string;
  columnName: string;
}

export interface AlterColumnOperation {
  type: 'alterColumn';
  tableName: string;
  columnName: string;
  changes: Partial<ColumnDefinition>;
}

export interface CreateIndexOperation {
  type: 'createIndex';
  tableName: string;
  indexName: string;
  columns: string[];
  unique?: boolean;
}

export interface DropIndexOperation {
  type: 'dropIndex';
  indexName: string;
}

export interface RenameTableOperation {
  type: 'renameTable';
  oldTableName: string;
  newTableName: string;
}

export interface RenameColumnOperation {
  type: 'renameColumn';
  tableName: string;
  oldColumnName: string;
  newColumnName: string;
}

export interface AddForeignKeyOperation {
  type: 'addForeignKey';
  tableName: string;
  columnName: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface DropForeignKeyOperation {
  type: 'dropForeignKey';
  tableName: string;
  constraintName: string;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  default?: string;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  foreignKey?: {
    table: string;
    column: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  };
}

export interface Migration {
  id: string;
  name: string;
  operations: MigrationOperation[];
  dependencies: string[];
  createdAt: Date;
}

// ─── Database Types ───────────────────────────────────────────────────────────

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

// ─── Model Instance ───────────────────────────────────────────────────────────

export abstract class Model {
  id!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static meta: ModelMeta;
  static fields: Map<string, FieldDefinition>;
  static relations: Map<string, RelationDefinition>;
  static signals: Map<SignalType, SignalHandler[]>;
  static _modelName: string;
  static tableName: string;

  /**
   * Save this instance to the database.
   */
  async save(): Promise<this> {
    const { ModelManager } = await import('./model.js');
    return ModelManager.save(this);
  }

  /**
   * Delete this instance from the database.
   */
  async delete(): Promise<void> {
    const { ModelManager } = await import('./model.js');
    return ModelManager.delete(this);
  }

  /**
   * Refresh this instance from the database.
   */
  async refresh(): Promise<this> {
    const { ModelManager } = await import('./model.js');
    return ModelManager.refresh(this);
  }

  /**
   * Convert to plain object.
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const fields = (this.constructor as typeof Model).fields;
    for (const [key] of fields) {
      result[key] = (this as Record<string, unknown>)[key];
    }
    // Include loaded relations
    const relations = (this.constructor as typeof Model).relations;
    for (const [key] of relations) {
      if ((this as Record<string, unknown>)[key] !== undefined) {
        result[key] = (this as Record<string, unknown>)[key];
      }
    }
    result.id = this.id;
    result.createdAt = this.createdAt;
    result.updatedAt = this.updatedAt;
    return result;
  }
}
