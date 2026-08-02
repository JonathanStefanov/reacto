/**
 * Reacto Core — Type definitions
 */

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
  | 'url';

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
}

export interface FieldDefinition extends FieldOptions {
  name: string;
  propertyKey: string;
}

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

// ─── Relation Types ──────────────────────────────────────────────────────────

export type RelationType = 'foreignKey' | 'oneToOne' | 'oneToMany' | 'manyToOne';

export interface RelationDefinition {
  name: string;
  type: RelationType;
  targetModel: string | (() => string);
  foreignKeyColumn?: string;
  propertyKey: string;
  nullable?: boolean;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  mappedBy?: string;
}

export interface ForeignKeyConstraint {
  type: 'foreignKey';
  tableName: string;
  columnName: string;
  referenceTable: string;
  referenceColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  constraintName?: string;
}

/**
 * Type helper: Extract the primary key type of a model.
 * Usage: `Id<User>` → `number` (the FK column type)
 */
export type Id<T> = T extends { id: infer PK } ? PK : number;

export type ModelClass<T extends Model = Model> = {
  new (...args: unknown[]): T;
  meta: ModelMeta;
  tableName: string;
  fields: Map<string, FieldDefinition>;
  relations: Map<string, RelationDefinition>;
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
  | ForeignKeyConstraint;

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
   * Includes loaded relations (from .with()).
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const fields = (this.constructor as typeof Model).fields;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const relations = (this.constructor as typeof Model).relations;

    // Regular fields
    for (const [key] of fields) {
      result[key] = (this as Record<string, unknown>)[key];
    }
    result.id = this.id;
    result.createdAt = this.createdAt;
    result.updatedAt = this.updatedAt;

    // Loaded relations
    if (relations) {
      for (const [key, rel] of relations) {
        const value = (this as Record<string, unknown>)[key];
        if (value === undefined) continue;

        if (Array.isArray(value)) {
          result[key] = value.map((v: unknown) =>
            v && typeof v === 'object' && 'toJSON' in v
              ? (v as { toJSON: () => unknown }).toJSON()
              : v
          );
        } else if (value && typeof value === 'object' && 'toJSON' in value) {
          result[key] = (value as { toJSON: () => unknown }).toJSON();
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }
}
