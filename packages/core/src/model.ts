/**
 * Reacto — Model Manager (CRUD operations + QuerySet-like API)
 *
 * Provides Django-style ORM operations:
 *   User.objects.all()
 *   User.objects.filter({ username: 'john' })
 *   User.objects.create({ username: 'john' })
 *   User.objects.get({ id: 1 })
 *   User.objects.with('posts').all()  // eager loading
 */
import { query } from './database.js';
import type {
  Model,
  ModelClass,
  WhereClause,
  OrderClause,
  QueryOptions,
  AggregateOptions,
  AggregateResult,
  RelationDefinition,
} from './types.js';
import { runSignal } from './signals/index.js';
import { validateModel, ValidationError } from './validators/index.js';
import { getCache, queryCacheKey } from './cache/index.js';

// ─── QuerySet ─────────────────────────────────────────────────────────────────

export class QuerySet<T extends Model> {
  private modelClass: ModelClass<T>;
  private options: QueryOptions = {};
  private cacheTtl: number | null = null;

  constructor(modelClass: ModelClass<T>, options: QueryOptions = {}) {
    this.modelClass = modelClass;
    this.options = options;
  }

  filter(conditions: Record<string, unknown>): QuerySet<T> {
    const where = this.buildWhere(conditions);
    return new QuerySet<T>(this.modelClass, {
      ...this.options,
      where: [...(this.options.where ?? []), ...where],
    });
  }

  exclude(conditions: Record<string, unknown>): QuerySet<T> {
    const where = this.buildWhere(conditions).map((w) => ({
      ...w,
      operator: negateOperator(w.operator) as WhereClause['operator'],
    }));
    return new QuerySet<T>(this.modelClass, {
      ...this.options,
      where: [...(this.options.where ?? []), ...where],
    });
  }

  orderBy(...fields: string[]): QuerySet<T> {
    const orders: OrderClause[] = fields.map((f) => {
      if (f.startsWith('-')) {
        return { field: f.slice(1), direction: 'DESC' as const };
      }
      return { field: f, direction: 'ASC' as const };
    });
    return new QuerySet<T>(this.modelClass, {
      ...this.options,
      orderBy: orders,
    });
  }

  limit(count: number): QuerySet<T> {
    return new QuerySet<T>(this.modelClass, { ...this.options, limit: count });
  }

  offset(count: number): QuerySet<T> {
    return new QuerySet<T>(this.modelClass, { ...this.options, offset: count });
  }

  select(...fields: string[]): QuerySet<T> {
    return new QuerySet<T>(this.modelClass, {
      ...this.options,
      select: fields,
    });
  }

  /**
   * Full-text search across multiple fields.
   *
   *   User.objects.search(['username', 'email'], 'john').all()
   *   User.objects.search(['title', 'content'], 'react', { fullText: true }).all()
   */
  search(fields: string[], query: string, options?: { fullText?: boolean }): QuerySet<T> {
    return new QuerySet<T>(this.modelClass, {
      ...this.options,
      search: { fields, query, fullText: options?.fullText ?? false },
    });
  }

  /**
   * Cache query results for the given TTL (in seconds).
   *
   *   const users = await User.objects.filter({ active: true }).cache(300).all();
   *   // Results cached for 5 minutes, auto-invalidated on User save/delete
   */
  cache(ttlSeconds: number): QuerySet<T> {
    const clone = new QuerySet<T>(this.modelClass, { ...this.options });
    clone.cacheTtl = ttlSeconds;
    return clone;
  }

  /**
   * Eager load relations (like Django's select_related / prefetch_related).
   *
   *   User.objects.with('posts', 'profile').all()
   */
  with(...relations: string[]): QuerySet<T> {
    return new QuerySet<T>(this.modelClass, {
      ...this.options,
      relations: [...(this.options.relations ?? []), ...relations],
    });
  }

  /**
   * Paginate results.
   */
  paginate(page: number, pageSize: number): QuerySet<T> {
    const offset = (page - 1) * pageSize;
    return new QuerySet<T>(this.modelClass, {
      ...this.options,
      limit: pageSize,
      offset,
    });
  }

  async all(): Promise<T[]> {
    return this.execute();
  }

  async first(): Promise<T | null> {
    const results = await this.limit(1).execute();
    return results[0] ?? null;
  }

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

  async count(): Promise<number> {
    const sql = this.buildCountSql();
    const result = await query(sql, this.buildParams());
    return parseInt(result.rows[0].count as string, 10);
  }

  async exists(): Promise<boolean> {
    return (await this.count()) > 0;
  }

  async aggregate(options: AggregateOptions): Promise<AggregateResult> {
    const sql = this.buildAggregateSql(options);
    const result = await query(sql, this.buildParams());
    return result.rows[0] ?? {};
  }

  async delete(): Promise<number> {
    // Cascade delete: load IDs first, then delete related, then delete self
    const ids = await this.select('id').all();
    if (ids.length === 0) return 0;

    const idList = ids.map((r) => r.id);
    await cascadeDelete(this.modelClass, idList);

    const sql = this.buildDeleteSql();
    const result = await query(sql, this.buildParams());
    return result.rowCount ?? 0;
  }

  async update(values: Record<string, unknown>): Promise<number> {
    const sql = this.buildUpdateSql(values);
    const params = [...Object.values(values), ...this.buildParams()];
    const result = await query(sql, params);
    return result.rowCount ?? 0;
  }

  private async execute(): Promise<T[]> {
    // Check cache first
    if (this.cacheTtl !== null) {
      const cache = getCache();
      const cacheKey = queryCacheKey(
        this.modelClass._modelName,
        'select',
        { options: this.options }
      );

      const cached = await cache.get<T[]>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Cache miss — execute query and cache result
      const results = await this.executeQuery();
      await cache.set(cacheKey, results, this.cacheTtl);
      cache.trackKey(this.modelClass._modelName, cacheKey);
      return results;
    }

    return this.executeQuery();
  }

  private async executeQuery(): Promise<T[]> {
    const sql = this.buildSelectSql();
    const result = await query(sql, this.buildParams());
    const instances = result.rows.map((row) => this.hydrate(row));

    // Eager load relations
    if (this.options.relations?.length) {
      await eagerLoad(this.modelClass, instances, this.options.relations);
    }

    return instances;
  }

  // ─── SQL Builders ─────────────────────────────────────────────────────────

  private buildSelectSql(): string {
    const table = this.modelClass.tableName;
    const fields = this.options.select?.length
      ? this.options.select.join(', ')
      : '*';
    let sql = `SELECT ${fields} FROM "${table}"`;

    const whereClauses: string[] = [];
    if (this.options.where?.length) {
      whereClauses.push(this.buildWhereSql());
    }
    if (this.options.search) {
      whereClauses.push(this.buildSearchSql());
    }
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (this.options.orderBy?.length) {
      const orders = this.options.orderBy
        .map((o) => `"${o.field}" ${o.direction}`)
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

  private buildCountSql(): string {
    const table = this.modelClass.tableName;
    let sql = `SELECT COUNT(*) as count FROM "${table}"`;
    const whereClauses: string[] = [];
    if (this.options.where?.length) {
      whereClauses.push(this.buildWhereSql());
    }
    if (this.options.search) {
      whereClauses.push(this.buildSearchSql());
    }
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
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
    return (this.options.where ?? [])
      .map((w, i) => {
        const paramName = `$${i + 1 + paramOffset}`;
        switch (w.operator) {
          case 'eq':
            return `"${w.field}" = ${paramName}`;
          case 'neq':
            return `"${w.field}" != ${paramName}`;
          case 'gt':
            return `"${w.field}" > ${paramName}`;
          case 'gte':
            return `"${w.field}" >= ${paramName}`;
          case 'lt':
            return `"${w.field}" < ${paramName}`;
          case 'lte':
            return `"${w.field}" <= ${paramName}`;
          case 'in':
            return `"${w.field}" = ANY(${paramName})`;
          case 'nin':
            return `"${w.field}" != ALL(${paramName})`;
          case 'like':
            return `"${w.field}" LIKE ${paramName}`;
          case 'ilike':
            return `"${w.field}" ILIKE ${paramName}`;
          case 'isNull':
            return `"${w.field}" IS NULL`;
          case 'isNotNull':
            return `"${w.field}" IS NOT NULL`;
          case 'between':
            return `"${w.field}" BETWEEN ${paramName} AND $${i + 2 + paramOffset}`;
          default:
            return `"${w.field}" = ${paramName}`;
        }
      })
      .join(' AND ');
  }

  private buildParams(): unknown[] {
    const params: unknown[] = [];

    // Where clause params
    for (const w of this.options.where ?? []) {
      if (w.operator !== 'isNull' && w.operator !== 'isNotNull') {
        params.push(w.value);
      }
    }

    // Search clause param
    if (this.options.search) {
      params.push('%' + this.options.search.query + '%');
    }

    return params;
  }

  private buildSearchSql(): string {
    const search = this.options.search!;
    const paramIdx = (this.options.where?.length ?? 0) + 1;

    if (search.fullText) {
      // PostgreSQL full-text search using to_tsvector / plainto_tsquery
      const vectorExpr = search.fields
        .map((f) => "coalesce(\"" + f + "\" , '')")
        .join(" || ' ' || ");
      return "to_tsvector('english', " + vectorExpr + ") @@ plainto_tsquery('english', $" + paramIdx + ")";
    }

    // ILIKE-based search across multiple fields
    const conditions = search.fields
      .map((f) => "\"" + f + "\" ILIKE $" + paramIdx)
      .join(' OR ');
    return '(' + conditions + ')';
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

  private hydrate(row: Record<string, unknown>): T {
    const instance = new this.modelClass() as unknown as Record<string, unknown>;
    const fields = this.modelClass.fields;

    for (const [propertyKey, fieldDef] of fields) {
      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      if (row[dbColumn] !== undefined) {
        instance[propertyKey] = row[dbColumn];
      }
    }

    if (row.id !== undefined) instance.id = row.id as number;
    if (row.created_at !== undefined) instance.createdAt = row.created_at as Date;
    if (row.updated_at !== undefined) instance.updatedAt = row.updated_at as Date;

    return instance as unknown as T;
  }
}

// ─── Eager Loading ────────────────────────────────────────────────────────────

async function eagerLoad<T extends Model>(
  modelClass: ModelClass<T>,
  instances: T[],
  relations: string[]
): Promise<void> {
  if (instances.length === 0) return;

  for (const relName of relations) {
    const rel = modelClass.relations.get(relName);
    if (!rel) continue;

    const targetClass = rel.target();

    if (rel.type === 'foreignKey' || rel.type === 'oneToOne') {
      // Load related records by FK
      const fkColumn = rel.foreignKey;
      const ids = instances
        .map((inst) => (inst as unknown as Record<string, unknown>)[fkColumn] as number)
        .filter(Boolean);

      if (ids.length === 0) continue;

      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `SELECT * FROM "${targetClass.tableName}" WHERE "id" IN (${placeholders})`;
      const result = await query(sql, ids);

      const map = new Map<number, Record<string, unknown>>();
      for (const row of result.rows) {
        map.set(row.id as number, row);
      }

      for (const inst of instances) {
        const fkValue = (inst as unknown as Record<string, unknown>)[fkColumn] as number;
        if (fkValue && map.has(fkValue)) {
          const related = new targetClass() as unknown as Record<string, unknown>;
          const row = map.get(fkValue)!;
          for (const [key, fieldDef] of targetClass.fields) {
            const dbCol = fieldDef.dbColumn || fieldDef.name;
            if (row[dbCol] !== undefined) related[key] = row[dbCol];
          }
          related.id = row.id;
          related.createdAt = row.created_at;
          related.updatedAt = row.updated_at;
          (inst as unknown as Record<string, unknown>)[relName] = related;
        }
      }
    } else if (rel.type === 'oneToMany') {
      // Find the FK on the target model that points back to us
      const inverseRel = findInverseRelation(targetClass, modelClass, rel.inverseSide);
      if (!inverseRel) continue;

      const ids = instances.map((inst) => inst.id);
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
      const fkCol = inverseRel.foreignKey;
      const sql = `SELECT * FROM "${targetClass.tableName}" WHERE "${fkCol}" IN (${placeholders})`;
      const result = await query(sql, ids);

      // Group by FK
      const grouped = new Map<number, Record<string, unknown>[]>();
      for (const row of result.rows) {
        const fkVal = row[fkCol] as number;
        const arr = grouped.get(fkVal) ?? [];
        arr.push(row);
        grouped.set(fkVal, arr);
      }

      for (const inst of instances) {
        const rows = grouped.get(inst.id) ?? [];
        (inst as unknown as Record<string, unknown>)[relName] = rows.map((row) => {
          const related = new targetClass() as unknown as Record<string, unknown>;
          for (const [key, fieldDef] of targetClass.fields) {
            const dbCol = fieldDef.dbColumn || fieldDef.name;
            if (row[dbCol] !== undefined) related[key] = row[dbCol];
          }
          related.id = row.id;
          related.createdAt = row.created_at;
          related.updatedAt = row.updated_at;
          return related;
        });
      }
    }
  }
}

function findInverseRelation(
  targetClass: ModelClass,
  sourceClass: ModelClass,
  inverseSide?: string
): RelationDefinition | undefined {
  if (inverseSide) {
    return targetClass.relations.get(inverseSide);
  }
  // Auto-find: look for a FK on target that points to source
  for (const [, rel] of targetClass.relations) {
    if ((rel.type === 'foreignKey' || rel.type === 'oneToOne') && rel.target() === sourceClass) {
      return rel;
    }
  }
  return undefined;
}

// ─── Cascade Delete ───────────────────────────────────────────────────────────

async function cascadeDelete(modelClass: ModelClass, ids: number[]): Promise<void> {
  for (const [, rel] of modelClass.relations) {
    if (rel.onDelete !== 'CASCADE') continue;

    const targetClass = rel.target();

    if (rel.type === 'oneToMany') {
      // Delete children that reference these parents
      const inverseRel = findInverseRelation(targetClass, modelClass, rel.inverseSide);
      if (!inverseRel) continue;

      const fkCol = inverseRel.foreignKey;
      // First cascade delete on grandchildren
      const childIds = await query(
        `SELECT "id" FROM "${targetClass.tableName}" WHERE "${fkCol}" = ANY($1)`,
        [ids]
      );
      if (childIds.rows.length > 0) {
        await cascadeDelete(targetClass, childIds.rows.map((r) => r.id as number));
      }
      await query(
        `DELETE FROM "${targetClass.tableName}" WHERE "${fkCol}" = ANY($1)`,
        [ids]
      );
    } else if (rel.type === 'foreignKey' || rel.type === 'oneToOne') {
      // Set FK to NULL on related records (or delete if CASCADE on the other side)
      // For FK relations, we don't delete the target — we just handle our own cascade
    }
  }
}

// ─── ModelManager (static CRUD) ───────────────────────────────────────────────

export class ModelManager {
  static objects<T extends Model>(modelClass: ModelClass<T>): QuerySet<T> {
    return new QuerySet<T>(modelClass);
  }

  static async create<T extends Model>(
    modelClass: ModelClass<T>,
    data: Partial<T>
  ): Promise<T> {
    // Validate
    const errors = validateModel(data as unknown as Record<string, unknown>, modelClass.fields);
    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    // Run preSave signal
    const tempInstance = new modelClass() as Record<string, unknown>;
    Object.assign(tempInstance, data);
    await runSignal(modelClass, 'preSave', tempInstance as unknown as T);

    const fields = modelClass.fields;
    const columns: string[] = [];
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (const [propertyKey, fieldDef] of fields) {
      if (fieldDef.primaryKey && fieldDef.autoIncrement) continue;
      if (propertyKey === 'id' || propertyKey === 'createdAt' || propertyKey === 'updatedAt') continue;

      const dbColumn = fieldDef.dbColumn || fieldDef.name;
      const value = (tempInstance as unknown as Record<string, unknown>)[propertyKey];

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

    // Run postSave signal
    await runSignal(modelClass, 'postSave', instance as unknown as T);

    // Invalidate cache for this model
    await getCache().invalidateModel(modelClass._modelName);

    return instance as unknown as T;
  }

  static async save<T extends Model>(instance: T): Promise<T> {
    const modelClass = instance.constructor as ModelClass<T>;

    // Validate
    const errors = validateModel(instance as unknown as Record<string, unknown>, modelClass.fields);
    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    // Run preSave signal
    await runSignal(modelClass, 'preSave', instance);

    const fields = modelClass.fields;

    if (instance.id) {
      // UPDATE
      const sets: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [propertyKey, fieldDef] of fields) {
        if (fieldDef.primaryKey) continue;
        if (propertyKey === 'createdAt') continue;

        const dbColumn = fieldDef.dbColumn || fieldDef.name;
        const value = (instance as unknown as Record<string, unknown>)[propertyKey];

        sets.push(`"${dbColumn}" = $${paramIndex++}`);
        values.push(value);
      }

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
          (instance as unknown as Record<string, unknown>)[propertyKey] = row[dbColumn];
        }
      }
      instance.updatedAt = row.updated_at as Date;

      // Run postSave signal
      await runSignal(modelClass, 'postSave', instance);

      // Invalidate cache for this model
      await getCache().invalidateModel(modelClass._modelName);

      return instance;
    } else {
      // INSERT
      return ModelManager.create(modelClass, instance as Partial<T>);
    }
  }

  static async delete<T extends Model>(instance: T): Promise<void> {
    const modelClass = instance.constructor as ModelClass<T>;
    if (!instance.id) {
      throw new Error('Cannot delete an unsaved instance.');
    }

    // Run preDelete signal
    await runSignal(modelClass, 'preDelete', instance);

    // Cascade delete related records
    await cascadeDelete(modelClass, [instance.id]);

    await query(`DELETE FROM "${modelClass.tableName}" WHERE "id" = $1`, [instance.id]);

    // Run postDelete signal
    await runSignal(modelClass, 'postDelete', instance);

    // Invalidate cache for this model
    await getCache().invalidateModel(modelClass._modelName);
  }

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
        (instance as unknown as Record<string, unknown>)[propertyKey] = row[dbColumn];
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
    gte: 'lt',
    gt: 'lte',
    lt: 'gte',
    lte: 'gt',
  };
  return negations[op] ?? op;
}
