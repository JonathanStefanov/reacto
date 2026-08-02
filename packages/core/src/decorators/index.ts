/**
 * Reacto — Model and Field decorators
 *
 * Django-style declarative model API:
 *
 *   @Model()
 *   class User extends ReactoModel {
 *     @Field({ type: 'string', maxLength: 150, unique: true })
 *     username: string;
 *   }
 *
 *   @Model()
 *   class Post extends ReactoModel {
 *     @ForeignKey(() => User)
 *     author: Id<User>;
 *
 *     @OneToMany(() => Comment, { mappedBy: 'post' })
 *     comments: Comment[];
 *   }
 */
import 'reflect-metadata';
import type {
  FieldOptions,
  ModelMeta,
  FieldDefinition,
  ModelClass,
  RelationDefinition,
} from '../types.js';
import { Model } from '../types.js';
import { registerModel } from '../registry.js';

const FIELD_METADATA_KEY = 'reacto:fields';
const RELATION_METADATA_KEY = 'reacto:relations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert PascalCase to snake_case.
 *   Post → post, UserProfile → user_profile
 */
function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Pluralize a simple English word.
 *   post → posts, user → users, category → categories
 */
function pluralize(word: string): string {
  if (word.endsWith('y') && !/[aeiou]y$/.test(word)) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') ||
      word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Derive table name from class name: Post → posts, UserProfile → user_profiles
 */
function deriveTableName(className: string): string {
  return pluralize(toSnakeCase(className));
}

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

// ─── @ForeignKey() decorator ──────────────────────────────────────────────────

/**
 * Foreign key relation — creates the FK column automatically.
 *
 * @example
 * ```ts
 * // Creates `author_id` column with FK constraint
 * @ForeignKey(() => User)
 * author: Id<User>;
 *
 * // Custom column name
 * @ForeignKey(() => User, { dbColumn: 'created_by' })
 * createdBy: Id<User>;
 * ```
 */
export function ForeignKey(
  modelResolver: () => ModelClass,
  options: {
    dbColumn?: string;
    nullable?: boolean;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  } = {}
) {
  return function (target: object, propertyKey: string): void {
    // Register relation
    const relations: Map<string, RelationDefinition> =
      Reflect.getOwnMetadata(RELATION_METADATA_KEY, target) ?? new Map();

    const fkColumn = options.dbColumn ?? `${propertyKey}_id`;

    relations.set(propertyKey, {
      name: propertyKey,
      type: 'foreignKey',
      targetModel: () => modelResolver()._modelName,
      foreignKeyColumn: fkColumn,
      propertyKey,
      nullable: options.nullable,
      onDelete: options.onDelete,
      onUpdate: options.onUpdate,
    });

    Reflect.defineMetadata(RELATION_METADATA_KEY, relations, target);

    // Also register the FK column as a field
    const fields: Map<string, FieldDefinition> =
      Reflect.getOwnMetadata(FIELD_METADATA_KEY, target) ?? new Map();

    // Resolve the target model to get its PK type (defaults to integer)
    const resolvedModel = modelResolver();
    const pkField = resolvedModel.fields?.get('id');
    const fkType = pkField?.type ?? 'integer';

    fields.set(propertyKey, {
      type: fkType,
      name: fkColumn,
      propertyKey,
      dbColumn: fkColumn,
      nullable: options.nullable,
      index: true,
    });

    Reflect.defineMetadata(FIELD_METADATA_KEY, fields, target);
  };
}

// ─── @OneToOne() decorator ────────────────────────────────────────────────────

/**
 * One-to-one reverse relation (no extra column — FK is on the target model).
 *
 * @example
 * ```ts
 * // In User model (reverse side)
 * @OneToOne(() => Profile, { mappedBy: 'user' })
 * profile: Profile;
 * ```
 */
export function OneToOne(
  modelResolver: () => ModelClass,
  options: { mappedBy: string } & Pick<RelationDefinition, 'onDelete' | 'onUpdate'> = { mappedBy: '' }
) {
  return function (target: object, propertyKey: string): void {
    const relations: Map<string, RelationDefinition> =
      Reflect.getOwnMetadata(RELATION_METADATA_KEY, target) ?? new Map();

    relations.set(propertyKey, {
      name: propertyKey,
      type: 'oneToOne',
      targetModel: () => modelResolver()._modelName,
      propertyKey,
      mappedBy: options.mappedBy,
      onDelete: options.onDelete,
      onUpdate: options.onUpdate,
    });

    Reflect.defineMetadata(RELATION_METADATA_KEY, relations, target);
  };
}

// ─── @OneToMany() decorator ───────────────────────────────────────────────────

/**
 * One-to-many reverse relation (no extra column — FK is on the target model).
 *
 * @example
 * ```ts
 * // In User model (reverse side)
 * @OneToMany(() => Post, { mappedBy: 'author' })
 * posts: Post[];
 * ```
 */
export function OneToMany(
  modelResolver: () => ModelClass,
  options: { mappedBy: string } = { mappedBy: '' }
) {
  return function (target: object, propertyKey: string): void {
    const relations: Map<string, RelationDefinition> =
      Reflect.getOwnMetadata(RELATION_METADATA_KEY, target) ?? new Map();

    relations.set(propertyKey, {
      name: propertyKey,
      type: 'oneToMany',
      targetModel: () => modelResolver()._modelName,
      propertyKey,
      mappedBy: options.mappedBy,
    });

    Reflect.defineMetadata(RELATION_METADATA_KEY, relations, target);
  };
}

// ─── @ManyToOne() decorator ───────────────────────────────────────────────────

/**
 * Many-to-one alias — identical to @ForeignKey (use whichever reads better).
 *
 * @example
 * ```ts
 * @ManyToOne(() => Author)
 * author: Id<Author>;
 * ```
 */
export function ManyToOne(
  modelResolver: () => ModelClass,
  options: Parameters<typeof ForeignKey>[1] = {}
) {
  return ForeignKey(modelResolver, options);
}

// ─── @Model() decorator ───────────────────────────────────────────────────────

/**
 * Decorate a class as a database model.
 *
 * tableName is optional — auto-derived from class name:
 *   Post → posts, UserProfile → user_profiles
 *
 * @example
 * ```ts
 * @Model()
 * class User extends ReactoModel {
 *   @Field({ type: 'string' }) username: string;
 * }
 *
 * // Override table name if needed
 * @Model({ tableName: 'blog_posts' })
 * class Post extends ReactoModel { ... }
 * ```
 */
export function ModelDecorator(meta?: Partial<ModelMeta>) {
  return function <T extends new (...args: unknown[]) => object>(target: T): T {
    const tableName = meta?.tableName ?? deriveTableName(target.name);

    // Collect fields from prototype chain
    const allFields = collectFields(target.prototype);

    // Add built-in fields (id, createdAt, updatedAt)
    const builtInFields = getBuiltInFields();
    for (const [key, field] of builtInFields) {
      if (!allFields.has(key)) {
        allFields.set(key, field);
      }
    }

    // Collect relations from prototype chain
    const allRelations = collectRelations(target.prototype);

    // Auto-generate indexes from foreign key columns
    const autoIndexes = buildAutoIndexes(allRelations, meta?.indexes);

    // Build full meta
    const fullMeta: ModelMeta = {
      tableName,
      ordering: meta?.ordering ?? ['-createdAt'],
      uniqueTogether: meta?.uniqueTogether,
      indexes: autoIndexes,
      verboseName: meta?.verboseName ?? target.name.toLowerCase(),
      verboseNamePlural: meta?.verboseNamePlural ?? `${target.name.toLowerCase()}s`,
    };

    // Attach to class
    const modelTarget = target as unknown as typeof Model;
    modelTarget.meta = fullMeta;
    modelTarget.fields = allFields;
    modelTarget.relations = allRelations;
    modelTarget.tableName = tableName;
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

// ─── Helper: collect relations from prototype chain ───────────────────────────

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

// ─── Helper: auto-generate indexes from FK relations ──────────────────────────

function buildAutoIndexes(
  relations: Map<string, RelationDefinition>,
  existing?: ModelMeta['indexes']
): ModelMeta['indexes'] {
  const indexes = existing ? [...existing] : [];
  const existingFields = new Set(indexes.flatMap((i) => i.fields));

  for (const [, rel] of relations) {
    if (rel.type === 'foreignKey' && rel.foreignKeyColumn) {
      // Auto-create index for FK columns (unless already indexed)
      if (!existingFields.has(rel.foreignKeyColumn)) {
        indexes.push({
          name: `idx_${rel.foreignKeyColumn}`,
          fields: [rel.foreignKeyColumn],
        });
      }
    }
  }

  return indexes.length > 0 ? indexes : undefined;
}

// ─── Re-export ────────────────────────────────────────────────────────────────

export { Model } from '../types.js';
export type { ModelMeta, FieldOptions, FieldDefinition, RelationDefinition } from '../types.js';
