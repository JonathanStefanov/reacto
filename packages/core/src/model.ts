/**
 * Reacto — Model Manager (CRUD operations + QuerySet-like API)
 *
 * Provides Django-style ORM operations:
 *   User.objects.all()
 *   User.objects.filter({ username: 'john' })
 *   User.objects.filter({}).with('posts').all()  ← eager loading
 *   User.objects.create({ username: 'john' })
 *   User.objects.get({ id: 1 })
 */
import { query } from './database.js';
import { getModel } from './registry.js';
import { validateModel } from './validators/index.js';
import { fireSignal } from './signals/index.js';
import type {
  Model,
  ModelClass,
  RelationDefinition,
  WhereClause,
  OrderClause,
  QueryOptions,
  AggregateOptions,
  AggregateResult,
} from './types.js';

// ─── QuerySet ─────────────────────────────────────────────────────────────────

interface JoinSpec {
  relation: RelationDefinition;
  alias: string;
  targetTable: string;
  joinColumn: string;
  onColumn: string;
}

/**
 * A lazy queryset for building queries (like Django's QuerySet).
 */
export class QuerySet<T extends Model> {
  private modelClass: ModelClass<T>;
  private options: QueryOptions = {};
  private eagerRelations: string[] = [];

  constructor(modelClass: ModelClass<T>, options: QueryOptions = {}) {
    this.modelClass = modelClass;
    this.options = options;
  }

  /**
   * Eager load a relation (like Django's .select_related()).
   *
   * @example
   * ```ts
   * const posts = await Post.objects.filter({}).with('author').all();
   * posts[0].author  // already loaded, no extra query
   * ```
   */
  with(...relations: string[]): QuerySet<T> {
    const qs = new QuerySet<T>(this.modelClass, { ...this.options });
    qs.eagerRelations = [...this.eagerRelations, ...relations];
    return qs;
  }

  /**
   * Filter results (like Django's .filter()).
   */
  filter(conditions: Record<string, unknown>): QuerySet<T> {
    const where = this.buildWhere(conditions);
    const qs = new QuerySet<T>(this.modelClass, {
      ...this.options,
      where: [...(this.options.where ?? []), ...where],
    });
    qs.eagerRelations = [...this.eagerRelations];
    return qs;
  }

  /**
   * Exclude results (like Django's .exclude()).
   */
  exclude(conditions: Record<string, unknown>): QuerySet<T> {
    const where = this.buildWhere(conditions).map((w) => ({
      ...w,
      operator: negateOperator(w.operator) as WhereClause['operator'],
    }));
    const qs = new QuerySet<T>(this.modelClass, {
      ...this.options,
      where: [...(this.options.where ?? []), ...where],
    });
    qs.eagerRelations = [...this.eagerRelations];
    return qs;
  }

  /**
   * Order results (like Django's .order_by()).
   */
  orderBy(...fields: string[]): QuerySet<T> {
    const orders: OrderClause[] = fields.map((f) => {
      if (f.startsWith('-')) {
        return { field: f.slice(1), direction: 'DESC' as const };
      }
      return { field: f, direction: 'ASC' as const };
    });
    const qs = new QuerySet<T>(this.modelClass, {
      ...this.options,
      orderBy: orders,
    });
    qs.eagerRelations = [...this.eagerRelations];
    return qs;
  }

  /**
   * Limit results (like Django's [:10] slicing).
   */
  limit(count: number): QuerySet<T> {
    const qs = new QuerySet<T>(this.modelClass, { ...this.options, limit: count });
    qs.eagerRelations = [...this.eagerRelations];
    return qs;
  }

  /**
   * Offset results.
   */
  offset(count: number): QuerySet<T> {
    const qs = new QuerySet<T>(this.modelClass, { ...this.options, offset: count });
    qs.eagerRelations = [...this.eagerRelations];
    return qs;
  }

  /**
   * Select specific fields.
   */
  select(...fields: string[]): QuerySet<T> {
    const qs = new QuerySet<T>(this.modelClass, {
      ...this.options,
      select: fields,
    });
    qs.eagerRelations = [...this.eagerRelations];
    return qs;
  }

  /**
   * Execute and return all results.
   */
  async all(): Promise<T[]> {
    return this.execute();
  }

  /**
   * Execute and return the first result.
   */
  async first(): Promise<T | null> {
    const results = await this.limit(1).execute();
    return results[0] ?? null;
  }

  /**
   * Execute and return exactly one result (throws if not found or multiple).
   */
  async get(conditions?: Record<string, unknown>): Promise<T> {
    let qs: QuerySet<T> = this as unknown as QuerySet<T>;
    if (conditions) {
      qs = qs.filter(conditions);
    }
    const results = await qs.limit(2).execute();
    if (results.length === 0) {
      throw new Error(`${this.modelClass._modelName} matching query does not exist.`);
    }
    if (results.length > 1) {
      throw new Error(`get() returned more than one ${this.modelClass._modelName}.`);
    }
    return results[0];
  }

  /**
   * Count results.
   */
  async count(): Promise<number> {
    const sql = this.buildCountSql();
    const result = await query(sql, this.buildParams());
    return parseInt(result.rows[0].count as string, 10);
  }

  /**
   * Check if any results exist.
   */
  async exists(): Promise<boolean> {
    return (await this.count()) > 0;
  }

  /**
   * Aggregate (COUNT, SUM, AVG, MIN, MAX).
   */
  async aggregate(options: AggregateOptions): Promise<AggregateResult> {
    const sql = this.buildAggregateSql(options);
    const result = await query(sql, this.buildParams());
    return result.rows[0] ?? {};
  }

  /**
   * Delete matching records.
   */
  async delete(): Promise<number> {
    const sql = this.buildDeleteSql();
    const result = await query(sql, this.buildParams());
    return result.rowCount ?? 0;
  }

  /**
   * Update matching records.
   */
  async update(values: Record<string, unknown>): Promise<number> {
    const sql = this.buildUpdateSql(values);
    const params = [...Object.values(values), ...this.buildParams()];
    const result = await query(sql, params);
    return result.rowCount ?? 0;
  }

  /**
   * Execute the query and return results.
   */
  private async execute(): Promise<T[]> {
    const joins = this.resolveJoins();
    const sql = this.buildSelectSql(joins);
    const result = await query(sql, this.buildParams());
    return result.rows.map((row) => this.hydrate(row, joins));
  }

  // ─── Join Resolution ─────────────────────────────────────────────────────

  /**
   * Resolve eager relation names into join specs.
   */
  private resolveJoins(): JoinSpec[] {
    const joins: JoinSpec[] = [];
    const relations = this.modelClass.relations;

    for (const relName of this.eagerRelations) {
      const rel = relations?.get(relName);
      if (!rel) {
        console.warn(`[Reacto] Relation "${relName}" not found on ${this.modelClass._modelName}, skipping.`);
        continue;
      }

      if (rel.type === 'foreignKey') {
        const targetName = typeof rel.targetModel === 'function' ? rel.targetModel() : rel.targetModel;
        const targetModel = getModel(targetName);
        if (!targetModel) {
          console.warn(`[Reacto] Model "${targetName}" not found for relation "${relName}", skipping.`);
          continue;
        }

        joins.push({
          relation: rel,
          alias: `__rel_${relName}`,
          targetTable: targetModel.tableName,
          joinColumn: `${this.modelClass.tableName}.${rel.foreignKeyColumn}`,
          onColumn: `${targetModel.tableName}.id`,
        });
      }
      // oneToMany and oneToOne reverse relations would need separate handling
      // (multiple rows or subqueries) — skip for now
    }

    return joins;
  }

  // ─── SQL Builders ─────────────────────────────────────────────────────────

  private buildSelectSql(joins: JoinSpec[] = []): string {
    const table = this.modelClass.tableName;
    let columns: string;

    if (joins.length > 0) {
      // Main table columns (prefixed for disambiguation)
      const mainCols = this.buildMainColumns(table);
      // Join columns (prefixed with alias)
      const joinCols = joins.flatMap((j) => this.buildJoinColumns(j));
      columns = [...mainCols, ...joinCols].join(', ');
    } else if (this.options.select?.length) {
      columns = this.options.select.join(', ');
    } else {
      columns = `"${table}".*`;
    }

    let sql = `SELECT ${columns} FROM "${table}"`;

    // Add JOINs
    for (const j of joins) {
      sql += ` LEFT JOIN "${j.targetTable}" AS "${j.alias}" ON ${j.joinColumn} = "${j.alias}".id`;
    }

    if (this.options.where?.length) {
      sql += ` WHERE ${this.buildWhereSql()}`;
    }
    if (this.options.orderBy?.length) {
      const orders = this.options.orderBy
        .map((o) => `"${table}"."${o.field}" ${o.direction}`)
        .join(', ');
      sql += ` ORDER BY ${orders}`;
    }
    if (this.options.limit !== undefined) {
      sql += ` LIMIT ${this.options.limit}`;
    }
    if (this.options.offset !== undefined) {
      sql += ` OFFSET ${this.options.offset}`;
    }

    return sql;
  }

  /**
   * Build column list for the main table, prefixed with table name.
   */
  private buildMainColumns(table: string): string[] {
    const cols: string[] = [];
    for (const [, fieldDef] of this.modelClass.fields) {
      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      cols.push(`"${table}"."${dbColumn}" AS "main__${dbColumn}"`);
    }
    // Always include built-in columns
    cols.push(`"${table}"."id" AS "main__id"`);
    cols.push(`"${table}"."created_at" AS "main__created_at"`);
    cols.push(`"${table}"."updated_at" AS "main__updated_at"`);
    // Deduplicate
    return [...new Set(cols)];
  }

  /**
   * Build column list for a join, prefixed with alias.
   */
  private buildJoinColumns(join: JoinSpec): string[] {
    const targetModel = getModel(
      typeof join.relation.targetModel === 'function'
        ? join.relation.targetModel()
        : join.relation.targetModel
    );
    if (!targetModel) return [];

    const cols: string[] = [];
    for (const [, fieldDef] of targetModel.fields) {
      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      cols.push(`"${join.alias}"."${dbColumn}" AS "${join.alias}__${dbColumn}"`);
    }
    cols.push(`"${join.alias}"."id" AS "${join.alias}__id"`);
    cols.push(`"${join.alias}"."created_at" AS "${join.alias}__created_at"`);
    cols.push(`"${join.alias}"."updated_at" AS "${join.alias}__updated_at"`);
    return [...new Set(cols)];
  }

  private buildCountSql(): string {
    const table = this.modelClass.tableName;
    let sql = `SELECT COUNT(*) as count FROM "${table}"`;
    if (this.options.where?.length) {
      sql += ` WHERE ${this.buildWhereSql()}`;
    }
    return sql;
  }

  private buildAggregateSql(options: AggregateOptions): string {
    const table = this.modelClass.tableName;
    const field = options.field ? `"${options.field}"` : '*';
    let sql = `SELECT ${options.function}(${field}) as result FROM "${table}"`;

    if (this.options.where?.length) {
      sql += ` WHERE ${this.buildWhereSql()}`;
    }
    if (options.groupBy?.length) {
      sql += ` GROUP BY ${options.groupBy.map((f) => `"${f}"`).join(', ')}`;
    }

    return sql;
  }

  private buildDeleteSql(): string {
    const table = this.modelClass.tableName;
    let sql = `DELETE FROM "${table}"`;
    if (this.options.where?.length) {
      sql += ` WHERE ${this.buildWhereSql()}`;
    }
    return sql;
  }

  private buildUpdateSql(values: Record<string, unknown>): string {
    const table = this.modelClass.tableName;
    const setClauses = Object.keys(values)
      .map((key, i) => `"${key}" = $${i + 1}`)
      .join(', ');
    let sql = `UPDATE "${table}" SET ${setClauses}`;

    if (this.options.where?.length) {
      const paramOffset = Object.keys(values).length;
      sql += ` WHERE ${this.buildWhereSql(paramOffset)}`;
    }

    return sql;
  }

  private buildWhereSql(paramOffset = 0): string {
    const table = this.modelClass.tableName;
    return (this.options.where ?? [])
      .map((w, i) => {
        const paramName = `$${i + 1 + paramOffset}`;
        const qualifiedField = `"${table}"."${w.field}"`;
        switch (w.operator) {
          case 'eq':
            return `${qualifiedField} = ${paramName}`;
          case 'neq':
            return `${qualifiedField} != ${paramName}`;
          case 'gt':
            return `${qualifiedField} > ${paramName}`;
          case 'gte':
            return `${qualifiedField} >= ${paramName}`;
          case 'lt':
            return `${qualifiedField} < ${paramName}`;
          case 'lte':
            return `${qualifiedField} <= ${paramName}`;
          case 'in':
            return `${qualifiedField} = ANY(${paramName})`;
          case 'nin':
            return `${qualifiedField} != ALL(${paramName})`;
          case 'like':
            return `${qualifiedField} LIKE ${paramName}`;
          case 'ilike':
            return `${qualifiedField} ILIKE ${paramName}`;
          case 'isNull':
            return `${qualifiedField} IS NULL`;
          case 'isNotNull':
            return `${qualifiedField} IS NOT NULL`;
          case 'between':
            return `${qualifiedField} BETWEEN ${paramName} AND $${i + 2 + paramOffset}`;
          default:
            return `${qualifiedField} = ${paramName}`;
        }
      })
      .join(' AND ');
  }

  private buildParams(): unknown[] {
    return (this.options.where ?? [])
      .filter((w) => w.operator !== 'isNull' && w.operator !== 'isNotNull')
      .map((w) => w.value);
  }

  private buildWhere(conditions: Record<string, unknown>): WhereClause[] {
    return Object.entries(conditions).map(([field, value]) => {
      if (value === null) {
        return { field, operator: 'isNull' as const, value: null };
      }
      if (value === undefined) {
        return { field, operator: 'isNotNull' as const, value: null };
      }
      return { field, operator: 'eq' as const, value };
    });
  }

  /**
   * Hydrate a database row into a model instance.
   * Handles eager-loaded relations when joins are present.
   */
  private hydrate(row: Record<string, unknown>, joins: JoinSpec[] = []): T {
    const instance = new this.modelClass() as Record<string, unknown>;
    const fields = this.modelClass.fields;

    if (joins.length > 0) {
      // Prefixed columns: main__field_name
      for (const [propertyKey, fieldDef] of fields) {
        const dbColumn = fieldDef.dbColumn || fieldDef.name;
        const prefixed = `main__${dbColumn}`;
        if (row[prefixed] !== undefined) {
          instance[propertyKey] = row[prefixed];
        }
      }
      if (row.main__id !== undefined) instance.id = row.main__id as number;
      if (row.main__created_at !== undefined) instance.createdAt = row.main__created_at as Date;
      if (row.main__updated_at !== undefined) instance.updatedAt = row.main__updated_at as Date;

      // Hydrate eager-loaded relations
      for (const j of joins) {
        const targetModel = getModel(
          typeof j.relation.targetModel === 'function'
            ? j.relation.targetModel()
            : j.relation.targetModel
        );
        if (!targetModel) continue;

        // Check if the join has data (not all nulls from LEFT JOIN)
        const hasData = row[`${j.alias}__id`] !== null;
        if (!hasData) {
          instance[j.relation.propertyKey] = null;
          continue;
        }

        const relInstance = new targetModel() as unknown as Record<string, unknown>;
        for (const [, fieldDef] of targetModel.fields) {
          const dbColumn = fieldDef.dbColumn || fieldDef.name;
          const prefixed = `${j.alias}__${dbColumn}`;
          if (row[prefixed] !== undefined) {
            relInstance[fieldDef.propertyKey] = row[prefixed];
          }
        }
        relInstance.id = row[`${j.alias}__id`] as number;
        if (row[`${j.alias}__created_at`] !== undefined)
          relInstance.createdAt = row[`${j.alias}__created_at`] as Date;
        if (row[`${j.alias}__updated_at`] !== undefined)
          relInstance.updatedAt = row[`${j.alias}__updated_at`] as Date;

        instance[j.relation.propertyKey] = relInstance as unknown as Model;
      }
    } else {
      // No joins — simple hydration (existing behavior)
      for (const [propertyKey, fieldDef] of fields) {
        const dbColumn = fieldDef.dbColumn || fieldDef.name;
        if (row[dbColumn] !== undefined) {
          instance[propertyKey] = row[dbColumn];
        }
      }
      if (row.id !== undefined) instance.id = row.id as number;
      if (row.created_at !== undefined) instance.createdAt = row.created_at as Date;
      if (row.updated_at !== undefined) instance.updatedAt = row.updated_at as Date;
    }

    return instance as unknown as T;
  }
}

// ─── ModelManager (static CRUD) ───────────────────────────────────────────────

/**
 * Static CRUD operations for models (like Django's Manager).
 */
export class ModelManager {
  /**
   * Get a QuerySet for a model.
   */
  static objects<T extends Model>(modelClass: ModelClass<T>): QuerySet<T> {
    return new QuerySet<T>(modelClass);
  }

  /**
   * Create a new record.
   * Runs validators and fires pre_save / post_save signals.
   */
  static async create<T extends Model>(
    modelClass: ModelClass<T>,
    data: Partial<T>
  ): Promise<T> {
    // Run validators
    const dataRecord = data as Record<string, unknown>;
    validateModel(dataRecord, modelClass.fields, modelClass._modelName);

    const fields = modelClass.fields;
    const columns: string[] = [];
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const [propertyKey, fieldDef] of fields) {
      if (fieldDef.primaryKey && fieldDef.autoIncrement) continue;
      if (propertyKey === 'id' || propertyKey === 'createdAt' || propertyKey === 'updatedAt') continue;

      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      const value = (data as Record<string, unknown>)[propertyKey];

      if (value !== undefined) {
        columns.push(`"${dbColumn}"`);
        values.push(value);
        placeholders.push(`$${paramIndex++}`);
      }
    }

    const sql = `INSERT INTO "${modelClass.tableName}" (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const result = await query(sql, values);

    const instance = new modelClass() as Record<string, unknown>;
    const row = result.rows[0];
    for (const [propertyKey, fieldDef] of fields) {
      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      if (row[dbColumn] !== undefined) {
        instance[propertyKey] = row[dbColumn];
      }
    }
    instance.id = row.id as number;
    instance.createdAt = row.created_at as Date;
    instance.updatedAt = row.updated_at as Date;

    // Fire post_save signal
    await fireSignal('post_save', instance as unknown as Model);

    return instance as unknown as T;
  }

  /**
   * Save (upsert) a model instance.
   * Runs validators and fires pre_save / post_save signals.
   */
  static async save<T extends Model>(instance: T): Promise<T> {
    const modelClass = instance.constructor as ModelClass<T>;
    const fields = modelClass.fields;

    if (instance.id) {
      // Fire pre_save signal
      await fireSignal('pre_save', instance);

      // UPDATE
      const sets: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [propertyKey, fieldDef] of fields) {
        if (fieldDef.primaryKey) continue;
        if (propertyKey === 'createdAt') continue;

        const dbColumn = fieldDef.dbColumn || fieldDef.name;
        const value = (instance as Record<string, unknown>)[propertyKey];

        sets.push(`"${dbColumn}" = $${paramIndex++}`);
        values.push(value);
      }

      // Always update updated_at
      sets.push(`"updated_at" = NOW()`);
      values.push(instance.id);

      const sql = `UPDATE "${modelClass.tableName}" SET ${sets.join(', ')} WHERE "id" = $${paramIndex} RETURNING *`;
      const result = await query(sql, values);

      if (result.rows.length === 0) {
        throw new Error(`${modelClass._modelName} with id ${instance.id} not found.`);
      }

      const row = result.rows[0];
      for (const [propertyKey, fieldDef] of fields) {
        const dbColumn = fieldDef.dbColumn || fieldDef.name;
        if (row[dbColumn] !== undefined) {
          (instance as Record<string, unknown>)[propertyKey] = row[dbColumn];
        }
      }
      instance.updatedAt = row.updated_at as Date;

      // Fire post_save signal
      await fireSignal('post_save', instance);

      return instance;
    } else {
      // INSERT — run validators then create
      const dataRecord = instance as unknown as Record<string, unknown>;
      validateModel(dataRecord, modelClass.fields, modelClass._modelName);
      return ModelManager.create(modelClass, instance as Partial<T>);
    }
  }

  /**
   * Delete a model instance.
   * Respects cascade delete from ForeignKey onDelete option.
   * Fires pre_delete / post_delete signals.
   */
  static async delete<T extends Model>(instance: T): Promise<void> {
    const modelClass = instance.constructor as ModelClass<T>;
    if (!instance.id) {
      throw new Error('Cannot delete an unsaved instance.');
    }

    // Fire pre_delete signal
    await fireSignal('pre_delete', instance);

    // Cascade delete: find models that have FK pointing at this model
    const { getAllModels } = await import('./registry.js');
    const allModels = getAllModels();

    for (const [, otherModel] of allModels) {
      const relations = otherModel.relations;
      if (!relations) continue;

      for (const [, rel] of relations) {
        if (rel.type !== 'foreignKey') continue;

        const targetName = typeof rel.targetModel === 'function' ? rel.targetModel() : rel.targetModel;
        if (targetName !== modelClass._modelName) continue;

        const fkColumn = rel.foreignKeyColumn;
        if (!fkColumn) continue;

        if (rel.onDelete === 'CASCADE') {
          // Delete all related records
          await query(
            `DELETE FROM "${otherModel.tableName}" WHERE "${fkColumn}" = $1`,
            [instance.id]
          );
        } else if (rel.onDelete === 'SET NULL') {
          // Set FK to null
          await query(
            `UPDATE "${otherModel.tableName}" SET "${fkColumn}" = NULL WHERE "${fkColumn}" = $1`,
            [instance.id]
          );
        }
        // RESTRICT / NO ACTION: let the DB enforce the constraint
      }
    }

    await query(`DELETE FROM "${modelClass.tableName}" WHERE "id" = $1`, [instance.id]);

    // Fire post_delete signal
    await fireSignal('post_delete', instance);
  }

  /**
   * Refresh an instance from the database.
   */
  static async refresh<T extends Model>(instance: T): Promise<T> {
    const modelClass = instance.constructor as ModelClass<T>;
    if (!instance.id) {
      throw new Error('Cannot refresh an unsaved instance.');
    }

    const result = await query(
      `SELECT * FROM "${modelClass.tableName}" WHERE "id" = $1`,
      [instance.id]
    );

    if (result.rows.length === 0) {
      throw new Error(`${modelClass._modelName} with id ${instance.id} no longer exists.`);
    }

    const row = result.rows[0];
    const fields = modelClass.fields;
    for (const [propertyKey, fieldDef] of fields) {
      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      if (row[dbColumn] !== undefined) {
        (instance as Record<string, unknown>)[propertyKey] = row[dbColumn];
      }
    }
    instance.updatedAt = row.updated_at as Date;

    return instance;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function negateOperator(op: string): string {
  const negations: Record<string, string> = {
    eq: 'neq',
    neq: 'eq',
    gt: 'lte',
    gte: 'lt',
    lt: 'gte',
    lte: 'gt',
  };
  return negations[op] ?? op;
}
