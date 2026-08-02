/**
 * Reacto — PostgreSQL connection pool
 */
import pg from 'pg';
import type { DatabaseConfig } from './types.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let config: DatabaseConfig | null = null;

/**
 * Configure the database connection.
 */
export function configureDatabase(dbConfig: DatabaseConfig): void {
  config = dbConfig;
  // Reset pool on reconfigure
  if (pool) {
    pool.end();
    pool = null;
  }
}

/**
 * Get or create the connection pool.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    if (!config) {
      throw new Error(
        '[Reacto] Database not configured. Call configureDatabase() first, or set REACTO_DATABASE_URL environment variable.'
      );
    }

    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.max ?? 20,
      idleTimeoutMillis: config.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config.connectionTimeoutMillis ?? 5000,
    });

    pool.on('error', (err) => {
      console.error('[Reacto] Unexpected pool error:', err);
    });
  }

  return pool;
}

/**
 * Get a client from the pool (for transactions).
 */
export async function getClient(): Promise<pg.PoolClient> {
  return getPool().connect();
}

/**
 * Execute a query.
 */
export async function query<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  const pool = getPool();
  const start = Date.now();
  const result = await pool.query<T>(text, params as unknown[]);
  const duration = Date.now() - start;

  if (process.env.REACTO_DEBUG) {
    console.log(`[Reacto SQL] ${text} (${duration}ms)`);
    if (params?.length) console.log(`[Reacto SQL] Params:`, params);
  }

  return result;
}

/**
 * Execute a transaction.
 */
export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close the pool (for graceful shutdown).
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Parse a DATABASE_URL into config.
 */
export function parseDatabaseUrl(url: string): DatabaseConfig {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '5432', 10),
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
    ssl: parsed.searchParams.get('ssl') === 'true' ? { rejectUnauthorized: false } : undefined,
  };
}

/**
 * Auto-configure from environment.
 */
export function autoConfigure(): void {
  const url = process.env.REACTO_DATABASE_URL || process.env.DATABASE_URL;
  if (url) {
    configureDatabase(parseDatabaseUrl(url));
  }
}
