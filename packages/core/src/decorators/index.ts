/**
 * Reacto — Model, Field, Relation, and Signal decorators
 *
 * Provides the Django-style declarative model API:
 *
 *   @Model({ tableName: 'users' })
 *   class User extends ReactoModel {
 *     @Field({ type: 'string', maxLength: 150, unique: true })
 *     username: string;
 *
 *     @OneToMany(() => Post, 'author')
 *     posts: Post[];
 *   }
 */
import 'reflect-metadata';
import type {
  FieldOptions,
  ModelMeta,
  FieldDefinition,
  ModelClass,
  RelationOptions,
  RelationDefinition,
  SignalType,
  SignalHandler,
  Validator,
} from '../types.js';
import { Model } from '../types.js';
import { registerModel } from '../registry.js';

const FIELD_METADATA_KEY = 'reacto:fields';
const RELATION_METADATA_KEY = 'reacto:relations';
const SIGNAL_METADATA_KEY = 'reacto:signals';

// ─── @Field() decorator ───────────────────────────────────────────────────────

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

// ─── Relation Decorators ──────────────────────────────────────────────────────

/**
 * @ForeignKey(() => User) — adds user_id FK column + relation
 */
export function ForeignKey(target: () => ModelClass, options?: Partial<RelationOptions>) {
  return function (targetObj: object, propertyKey: string): void {
    const relations: Map<string, RelationDefinition> =
      Reflect.getOwnMetadata(RELATION_METADATA_KEY, targetObj) ?? new Map();

    const fkColumn = `${propertyKey}Id`;

    relations.set(propertyKey, {
      type: 'foreignKey',
      target,
      foreignKey: fkColumn,
      onDelete: options?.onDelete ?? 'CASCADE',
      nullable: options?.nullable,
      inverseSide: options?.inverseSide,
      propertyKey,
    });

    // Also add the FK column as a field
    const fields: Map<string, FieldDefinition> =
      Reflect.getOwnMetadata(FIELD_METADATA_KEY, targetObj) ?? new Map();
    fields.set(fkColumn, {
      type: 'integer',
      name: fkColumn,
      propertyKey: fkColumn,
      nullable: options?.nullable ?? true,
      dbColumn: fkColumn,
      index: true,
    });
    Reflect.defineMetadata(FIELD_METADATA_KEY, fields, targetObj);

    Reflect.defineMetadata(RELATION_METADATA_KEY, relations, targetObj);
  };
}

/**
 * @OneToMany(() => Post, 'author') — one-to-many relation
 */
export function OneToMany(target: () => ModelClass, inverseSide: string) {
  return function (targetObj: object, propertyKey: string): void {
    const relations: Map<string, RelationDefinition> =
      Reflect.getOwnMetadata(RELATION_METADATA_KEY, targetObj) ?? new Map();

    relations.set(propertyKey, {
      type: 'oneToMany',
      target,
      inverseSide,
      foreignKey: '', // resolved at runtime
      propertyKey,
    });

    Reflect.defineMetadata(RELATION_METADATA_KEY, relations, targetObj);
  };
}

/**
 * @OneToOne(() => Profile, 'user') — one-to-one relation
 */
export function OneToOne(target: () => ModelClass, inverseSide?: string) {
  return function (targetObj: object, propertyKey: string): void {
    const relations: Map<string, RelationDefinition> =
      Reflect.getOwnMetadata(RELATION_METADATA_KEY, targetObj) ?? new Map();

    const fkColumn = `${propertyKey}Id`;

    relations.set(propertyKey, {
      type: 'oneToOne',
      target,
      foreignKey: fkColumn,
      inverseSide,
      onDelete: 'CASCADE',
      propertyKey,
    });

    // Add FK column
    const fields: Map<string, FieldDefinition> =
      Reflect.getOwnMetadata(FIELD_METADATA_KEY, targetObj) ?? new Map();
    fields.set(fkColumn, {
      type: 'integer',
      name: fkColumn,
      propertyKey: fkColumn,
      nullable: true,
      dbColumn: fkColumn,
      unique: true,
    });
    Reflect.defineMetadata(FIELD_METADATA_KEY, fields, targetObj);

    Reflect.defineMetadata(RELATION_METADATA_KEY, relations, targetObj);
  };
}

/**
 * @ManyToOne(() => User, 'posts') — many-to-one (alias for ForeignKey)
 */
export function ManyToOne(target: () => ModelClass, options?: Partial<RelationOptions>) {
  return ForeignKey(target, options);
}

// ─── @Signal() decorator ──────────────────────────────────────────────────────

/**
 * @Signal('preSave') — register a lifecycle hook
 */
export function Signal(type: SignalType) {
  return function (
    target: object,
    propertyKey: string,
    _descriptor: PropertyDescriptor
  ): void {
    const signals: Map<SignalType, string[]> =
      Reflect.getOwnMetadata(SIGNAL_METADATA_KEY, target) ?? new Map();

    const handlers = signals.get(type) ?? [];
    handlers.push(propertyKey);
    signals.set(type, handlers);

    Reflect.defineMetadata(SIGNAL_METADATA_KEY, signals, target);
  };
}

// ─── @Model() decorator ───────────────────────────────────────────────────────

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

    // Collect relations
    const allRelations = collectRelations(target.prototype);

    // Collect signals
    const allSignals = collectSignals(target.prototype);

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
    const modelTarget = target as unknown as typeof Model & Record<string, unknown>;
    modelTarget.meta = fullMeta;
    modelTarget.fields = allFields;
    modelTarget.relations = allRelations;
    modelTarget.signals = allSignals;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectFields(prototype: object): Map<string, FieldDefinition> {
  const fields = new Map<string, FieldDefinition>();

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

function collectRelations(prototype: object): Map<string, RelationDefinition> {
  const relations = new Map<string, RelationDefinition>();

  let current: object | null = prototype;
  while (current && current !== Object.prototype) {
    const meta: Map<string, RelationDefinition> | undefined = Reflect.getOwnMetadata(
      RELATION_METADATA_KEY,
      current
    );
    if (meta) {
      for (const [key, rel] of meta) {
        if (!relations.has(key)) {
          relations.set(key, rel);
        }
      }
    }
    current = Object.getPrototypeOf(current);
  }

  return relations;
}

function collectSignals(prototype: object): Map<SignalType, SignalHandler[]> {
  const signals = new Map<SignalType, SignalHandler[]>();

  let current: object | null = prototype;
  while (current && current !== Object.prototype) {
    const meta: Map<SignalType, string[]> | undefined = Reflect.getOwnMetadata(
      SIGNAL_METADATA_KEY,
      current
    );
    if (meta) {
      for (const [type, handlers] of meta) {
        const existing = signals.get(type) ?? [];
        for (const handlerName of handlers) {
          const handler = (current as Record<string, unknown>)[handlerName] as SignalHandler;
          if (handler && !existing.includes(handler)) {
            existing.push(handler);
          }
        }
        signals.set(type, existing);
      }
    }
    current = Object.getPrototypeOf(current);
  }

  return signals;
}

// ─── Re-exports ───────────────────────────────────────────────────────────────

export { Model } from '../types.js';
export type { ModelMeta, FieldOptions, FieldDefinition, RelationDefinition, SignalType, SignalHandler } from '../types.js';
