/**
 * @reacto-org/frontend — Shared types
 */

export interface ModelLike {
  tableName: string;
  _modelName: string;
  fields: Map<string, FieldMeta>;
}

export interface FieldMeta {
  type?: string;
  nullable?: boolean;
  default?: unknown;
  [key: string]: unknown;
}
