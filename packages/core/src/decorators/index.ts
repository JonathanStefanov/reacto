/**
 * Reacto — Model and Field decorators
 *
 * These provide the Django-style declarative model API:
 *
 *   @Model({ tableName: 'users' })
 *   class User extends ReactoModel {
 *     @Field({ type: 'string', maxLength: 150, unique: true })
 *     username: string;
 *   }
 */
import 'reflect-metadata';
import type { FieldOptions, ModelMeta, FieldDefinition, ModelClass } from '../types.js';
import { Model } from '../types.js';
import { registerModel } from '../registry.js';

const FIELD_METADATA_KEY = 'reacto:fields';

// ─── @Field() decorator ───────────────────────────────────────────────────────

/**
 * Decorate a class property as a database field.
 *
 * @example
 * ```ts
 * @Field({ type: 'string', maxLength: 150, unique: true })
 * username: string;
 * ```
 */
export function Field(options: FieldOptions) {
  return function (target: object, propertyKey: string): void {
    const fields: Map<string, FieldDefinition> =
      Reflect.getOwnMetadata(FIELD_METADATA_KEY, target) ?? new Map();

    fields.set(propertyKey, {
      ...options,
      name: options.dbColumn || propertyKey,
      propertyKey,
    });

    Reflect.defineMetadata(FIELD_METADATA_KEY, fields, target);
  };
}

// ─── @Model() decorator ───────────────────────────────────────────────────────

/**
 * Decorate a class as a database model.
 *
 * @example
 * ```ts
 * @Model({ tableName: 'users', ordering: ['-createdAt'] })
 * class User extends ReactoModel { ... }
 * ```
 */
export function ModelDecorator(meta: Partial<ModelMeta> & { tableName: string }) {
  return function <T extends new (...args: unknown[]) => object>(target: T): T {
    // Collect fields from prototype chain
    const allFields = collectFields(target.prototype);

    // Add built-in fields (id, createdAt, updatedAt)
    const builtInFields = getBuiltInFields();
    for (const [key, field] of builtInFields) {
      if (!allFields.has(key)) {
        allFields.set(key, field);
      }
    }

    // Build full meta
    const fullMeta: ModelMeta = {
      tableName: meta.tableName,
      ordering: meta.ordering ?? ['-createdAt'],
      uniqueTogether: meta.uniqueTogether,
      indexes: meta.indexes,
      verboseName: meta.verboseName ?? target.name.toLowerCase(),
      verboseNamePlural: meta.verboseNamePlural ?? `${target.name.toLowerCase()}s`,
    };

    // Attach to class
    const modelTarget = target as unknown as typeof Model;
    modelTarget.meta = fullMeta;
    modelTarget.fields = allFields;
    modelTarget.tableName = meta.tableName;
    modelTarget._modelName = target.name;

    // Register in global registry
    registerModel(modelTarget as unknown as ModelClass);

    return target;
  };
}

// ─── Built-in fields (id, createdAt, updatedAt) ──────────────────────────────

function getBuiltInFields(): Map<string, FieldDefinition> {
  const fields = new Map<string, FieldDefinition>();

  fields.set('id', {
    name: 'id',
    propertyKey: 'id',
    type: 'integer',
    primaryKey: true,
    autoIncrement: true,
  });

  fields.set('createdAt', {
    name: 'created_at',
    propertyKey: 'createdAt',
    type: 'datetime',
    default: 'now',
    dbColumn: 'created_at',
  });

  fields.set('updatedAt', {
    name: 'updated_at',
    propertyKey: 'updatedAt',
    type: 'datetime',
    default: 'now',
    dbColumn: 'updated_at',
  });

  return fields;
}

// ─── Helper: collect fields from prototype chain ──────────────────────────────

function collectFields(prototype: object): Map<string, FieldDefinition> {
  const fields = new Map<string, FieldDefinition>();

  // Walk prototype chain to collect inherited fields
  let current: object | null = prototype;
  while (current && current !== Object.prototype) {
    const meta: Map<string, FieldDefinition> | undefined = Reflect.getOwnMetadata(
      FIELD_METADATA_KEY,
      current
    );
    if (meta) {
      for (const [key, field] of meta) {
        if (!fields.has(key)) {
          fields.set(key, field);
        }
      }
    }
    current = Object.getPrototypeOf(current);
  }

  return fields;
}

// ─── Re-export Model base class ───────────────────────────────────────────────

export { Model } from '../types.js';
export type { ModelMeta, FieldOptions, FieldDefinition } from '../types.js';
