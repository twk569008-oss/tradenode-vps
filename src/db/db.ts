import { Pool, type PoolClient } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __tradenodePg: Pool | undefined;
}

function sslMode(): boolean | { rejectUnauthorized: boolean } {
  // Supabase requires SSL; allow disabling via env for exotic setups.
  if (process.env.PGSSL_DISABLE === 'true') return false;
  return { rejectUnauthorized: false };
}

function createPool(): Pool {
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error('DATABASE_URL is not set (Postgres connection string required).');

  const needsSsl = /supabase\.(co|com)/.test(conn) || process.env.PGSSLMODE === 'require';

  return new Pool({
    connectionString: conn,
    ssl: needsSsl ? sslMode() : undefined,
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 12_000,
  });
}

export function getDb(): Pool {
  if (!globalThis.__tradenodePg) globalThis.__tradenodePg = createPool();
  return globalThis.__tradenodePg;
}

export type Db = Pool;

// ─────────────────────────────────────────────────────────────
// Query helpers — mimic the old better-sqlite3 surface so the
// migration is mechanical: `.get(...)` → one row | null, `.all(...)` → rows.
// ─────────────────────────────────────────────────────────────
export class SqlQuery {
  constructor(private pool: Pool, private sql: string, private params: unknown[]) {}

  /** First row or null. */
  async get<T = Record<string, unknown>>(...overrideArgs: unknown[]): Promise<T | undefined> {
    const args = overrideArgs.length ? overrideArgs : this.params;
    const res = await this.pool.query(this.sql, args as unknown[]);
    return (res.rows[0] ?? undefined) as T | undefined;
  }

  /** All rows. */
  async all<T = Record<string, unknown>>(...overrideArgs: unknown[]): Promise<T[]> {
    const args = overrideArgs.length ? overrideArgs : this.params;
    const res = await this.pool.query(this.sql, args as unknown[]);
    return res.rows as T[];
  }

  /** Execute (INSERT/UPDATE/DELETE) and return rowcount. */
  async run(...overrideArgs: unknown[]): Promise<{ changes: number }> {
    const args = overrideArgs.length ? overrideArgs : this.params;
    const res = await this.pool.query(this.sql, args as unknown[]);
    return { changes: res.rowCount ?? 0 };
  }
}

/** Build a query object: q(sql, args).get() / .all() / .run() — async now. */
export function q(sql: string, ...params: unknown[]): SqlQuery {
  return new SqlQuery(getDb(), sql, params);
}

/** Convenience alias used across routes. */
export const query = q;

/** Run several statements in one transaction. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
