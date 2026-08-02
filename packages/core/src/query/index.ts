/**
 * Reacto — Query Builder (fluent SQL builder for complex queries)
 *
 * For when the ORM isn't enough:
 *   qb('users').select('*').where('age', '>', 18).orderBy('name').limit(10)
 */
import { query } from '../database.js';

type WhereValue = string | number | boolean | null | unknown[];

interface WhereCondition {
  field: string;
  operator: string;
  value: WhereValue;
  connector: 'AND' | 'OR';
}

/**
 * A fluent query builder for raw SQL queries.
 */
export class QueryBuilder {
  private _table: string;
  private _selects: string[] = ['*'];
  private _wheres: WhereCondition[] = [];
  private _orders: { field: string; direction: 'ASC' | 'DESC' }[] = [];
  private _limit?: number;
  private _offset?: number;
  private _joins: string[] = [];
  private _groupBy: string[] = [];
  private _having: string[] = [];
  private _paramIndex = 1;
  private _params: unknown[] = [];

  constructor(table: string) {
    this._table = table;
  }

  /**
   * Select specific columns.
   */
  select(...columns: string[]): this {
    this._selects = columns;
    return this;
  }

  /**
   * Add a WHERE condition.
   */
  where(field: string, operator: string, value: WhereValue): this {
    this._wheres.push({ field, operator, value, connector: 'AND' });
    return this;
  }

  /**
   * Add an OR WHERE condition.
   */
  orWhere(field: string, operator: string, value: WhereValue): this {
    this._wheres.push({ field, operator, value, connector: 'OR' });
    return this;
  }

  /**
   * Add a WHERE IN condition.
   */
  whereIn(field: string, values: unknown[]): this {
    return this.where(field, 'IN', values as WhereValue);
  }

  /**
   * Add a WHERE NOT IN condition.
   */
  whereNotIn(field: string, values: unknown[]): this {
    return this.where(field, 'NOT IN', values as WhereValue);
  }

  /**
   * Add a WHERE NULL condition.
   */
  whereNull(field: string): this {
    return this.where(field, 'IS NULL', null);
  }

  /**
   * Add a WHERE NOT NULL condition.
   */
  whereNotNull(field: string): this {
    return this.where(field, 'IS NOT NULL', null);
  }

  /**
   * Add a JOIN.
   */
  join(table: string, on: string, type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' = 'INNER'): this {
    this._joins.push(`${type} JOIN "${table}" ON ${on}`);
    return this;
  }

  /**
   * Add ORDER BY.
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this._orders.push({ field, direction });
    return this;
  }

  /**
   * Add GROUP BY.
   */
  groupBy(...fields: string[]): this {
    this._groupBy.push(...fields);
    return this;
  }

  /**
   * Add HAVING.
   */
  having(condition: string): this {
    this._having.push(condition);
    return this;
  }

  /**
   * Set LIMIT.
   */
  limit(count: number): this {
    this._limit = count;
    return this;
  }

  /**
   * Set OFFSET.
   */
  offset(count: number): this {
    this._offset = count;
    return this;
  }

  /**
   * Build and execute the SELECT query.
   */
  async execute<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T[]> {
    const sql = this.buildSelect();
    const result = await query<T>(sql, this._params);
    return result.rows;
  }

  /**
   * Execute and return the first row.
   */
  async first<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T | null> {
    this._limit = 1;
    const results = await this.execute<T>();
    return results[0] ?? null;
  }

  /**
   * Execute a COUNT query.
   */
  async count(): Promise<number> {
    const originalSelects = this._selects;
    this._selects = ['COUNT(*) as count'];
    const sql = this.buildSelect();
    this._selects = originalSelects;

    const result = await query(sql, this._params);
    return parseInt(result.rows[0].count as string, 10);
  }

  /**
   * Build the SELECT SQL string.
   */
  private buildSelect(): string {
    let sql = `SELECT ${this._selects.join(', ')} FROM "${this._table}"`;

    // Joins
    if (this._joins.length) {
      sql += ` ${this._joins.join(' ')}`;
    }

    // Where
    if (this._wheres.length) {
      sql += ` WHERE ${this.buildWheres()}`;
    }

    // Group By
    if (this._groupBy.length) {
      sql += ` GROUP BY ${this._groupBy.map((f) => `"${f}"`).join(', ')}`;
    }

    // Having
    if (this._having.length) {
      sql += ` HAVING ${this._having.join(' AND ')}`;
    }

    // Order By
    if (this._orders.length) {
      const orders = this._orders.map((o) => `"${o.field}" ${o.direction}`);
      sql += ` ORDER BY ${orders.join(', ')}`;
    }

    // Limit
    if (this._limit !== undefined) {
      sql += ` LIMIT ${this._limit}`;
    }

    // Offset
    if (this._offset !== undefined) {
      sql += ` OFFSET ${this._offset}`;
    }

    return sql;
  }

  /**
   * Build WHERE clause.
   */
  private buildWheres(): string {
    return this._wheres
      .map((w, i) => {
        const connector = i === 0 ? '' : ` ${w.connector} `;
        const param = `$${this._paramIndex++}`;

        if (w.operator === 'IS NULL' || w.operator === 'IS NOT NULL') {
          return `${connector}"${w.field}" ${w.operator}`;
        }

        if (w.operator === 'IN' || w.operator === 'NOT IN' && Array.isArray(w.value)) {
          const placeholders = (w.value as unknown[])
            .map(() => `$${this._paramIndex++}`)
            .join(', ');
          this._params.push(...(w.value as unknown[]));
          return `${connector}"${w.field}" ${w.operator} (${placeholders})`;
        }

        this._params.push(w.value);
        return `${connector}"${w.field}" ${w.operator} ${param}`;
      })
      .join('');
  }
}

/**
 * Create a new query builder for a table.
 */
export function qb(table: string): QueryBuilder {
  return new QueryBuilder(table);
}
