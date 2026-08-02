/**
 * Reacto — Field type mappings (TypeScript → PostgreSQL)
 */
import type { FieldType, ColumnDefinition, FieldDefinition } from '../types.js';

/**
 * Map a Reacto field type to a PostgreSQL column type.
 */
export function fieldTypeToPgType(type: FieldType, maxLength?: number, precision?: number, scale?: number): string {
  const mapping: Record<FieldType, string> = {
    string: maxLength ? `VARCHAR(${maxLength})` : 'VARCHAR(255)',
    text: 'TEXT',
    integer: 'INTEGER',
    bigInteger: 'BIGINT',
    float: 'DOUBLE PRECISION',
    decimal: precision && scale ? `DECIMAL(${precision},${scale})` : 'DECIMAL(10,2)',
    boolean: 'BOOLEAN',
    date: 'DATE',
    datetime: 'TIMESTAMPTZ',
    json: 'JSONB',
    uuid: 'UUID',
    email: maxLength ? `VARCHAR(${maxLength})` : 'VARCHAR(254)',
    url: maxLength ? `VARCHAR(${maxLength})` : 'VARCHAR(2048)',
  };

  return mapping[type] || 'TEXT';
}

/**
 * Convert a FieldDefinition to a ColumnDefinition for migrations.
 */
export function fieldToColumn(field: FieldDefinition): ColumnDefinition {
  return {
    name: field.dbColumn || field.name,
    type: fieldTypeToPgType(field.type, field.maxLength, field.precision, field.scale),
    nullable: field.nullable ?? (!field.primaryKey && field.default === undefined),
    default: field.default !== undefined ? formatDefault(field.default, field.type) : undefined,
    primaryKey: field.primaryKey ?? false,
    autoIncrement: field.autoIncrement ?? false,
    unique: field.unique ?? false,
    maxLength: field.maxLength,
    precision: field.precision,
    scale: field.scale,
  };
}

/**
 * Format a default value for PostgreSQL.
 */
function formatDefault(value: unknown, type: FieldType): string | undefined {
  if (value === null) return 'NULL';
  if (value === undefined) return undefined;

  switch (type) {
    case 'string':
    case 'text':
    case 'email':
    case 'url':
      return `'${String(value).replace(/'/g, "''")}'`;
    case 'integer':
    case 'bigInteger':
    case 'float':
    case 'decimal':
      return String(value);
    case 'boolean':
      return value ? 'TRUE' : 'FALSE';
    case 'datetime':
      if (value instanceof Date) return `'${value.toISOString()}'`;
      if (value === 'now') return 'NOW()';
      return `'${String(value)}'`;
    case 'date':
      if (value instanceof Date) return `'${value.toISOString().split('T')[0]}'`;
      return `'${String(value)}'`;
    case 'json':
      return `'${JSON.stringify(value)}'::jsonb`;
    case 'uuid':
      if (value === 'gen_random_uuid') return 'gen_random_uuid()';
      return `'${String(value)}'`;
    default:
      return `'${String(value)}'`;
  }
}

/**
 * Get the SQL for creating a column in a CREATE TABLE statement.
 */
export function columnToSql(column: ColumnDefinition): string {
  const parts: string[] = [column.name, column.type];

  if (column.primaryKey) parts.push('PRIMARY KEY');
  if (column.autoIncrement) parts.push('GENERATED ALWAYS AS IDENTITY');
  if (column.unique && !column.primaryKey) parts.push('UNIQUE');
  if (!column.nullable && !column.primaryKey) parts.push('NOT NULL');
  if (column.default !== undefined) parts.push(`DEFAULT ${column.default}`);

  return parts.join(' ');
}
