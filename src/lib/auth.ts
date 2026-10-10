import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getDb } from '@/db/db';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  locale: 'en' | 'ar';
  is_active: boolean;
  theme: string;
  created_at?: string;
  last_login_at?: string;
};

export const SESSION_COOKIE = 'tn_session';
export const SESSION_TTL_HOURS = 12 * 30; // 15 days
const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Never throws on malformed hashes (seed placeholders) — resolves false. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    if (!hash || !hash.startsWith('$2')) return false;
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

export function passwordMeetsPolicy(pw: string): boolean {
  return (
    pw.length >= 10 &&
    /[a-z]/.test(pw) &&
    /[A-Z]/.test(pw) &&
    /[0-9]/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

// ── Sessions ──────────────────────────────────────────────
export async function createSession(userId: string, ip: string | null, userAgent: string | null): Promise<string> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000).toISOString();
  await db.query(
    `INSERT INTO sessions (id, user_id, token_hash, ip, user_agent, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [newId('s'), userId, tokenHash, ip, userAgent, expires, new Date().toISOString()]
  );
  return token;
}

export async function getUserBySessionToken(token: string): Promise<SessionUser | null> {
  const db = getDb();
  const res = await db.query(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > $2`,
    [sha256(token), new Date().toISOString()]
  );
  const row = res.rows[0] as (Record<string, unknown> | undefined);
  if (!row || !row.is_active) return null;
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as 'customer' | 'admin',
    locale: (row.locale as 'en' | 'ar') ?? 'en',
    is_active: true,
    theme: (row.theme as string) || 'dark',
    created_at: row.created_at as string | undefined,
    last_login_at: row.last_login_at as string | undefined,
  };
}

export async function destroySession(token: string): Promise<void> {
  await getDb().query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await getDb().query('DELETE FROM sessions WHERE user_id = $1', [userId]);
}

// ── Audit ─────────────────────────────────────────────────
export async function writeAudit(opts: {
  actorId: string | null;
  actorRole: 'customer' | 'admin' | 'system';
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
  ip?: string | null;
}): Promise<void> {
  try {
    await getDb().query(
      `INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, details, ip, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        newId('al'),
        opts.actorId ?? 'system',
        opts.actorRole,
        opts.action,
        opts.entityType,
        opts.entityId ?? null,
        opts.details ? JSON.stringify(parseSafe(opts.details)) : null,
        opts.ip ?? null,
        new Date().toISOString(),
      ]
    );
  } catch (err) {
    console.error('[audit] write failed:', err instanceof Error ? err.message : err);
  }
}

/** JSON.stringify can fail on circular refs; fall back to a safe string. */
function parseSafe(v: unknown): unknown {
  try {
    JSON.stringify(v);
    return v;
  } catch {
    return { note: 'unserializable details' };
  }
}

// ── Password reset tokens ─────────────────────────────────
export async function createPasswordResetToken(userId: string): Promise<string> {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  await db.query(
    `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [newId('prt'), userId, sha256(token), new Date(Date.now() + 3600_000).toISOString(), new Date().toISOString()]
  );
  return token;
}

export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const db = getDb();
  const res = await db.query('SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1', [sha256(token)]);
  const row = res.rows[0] as (Record<string, unknown> | undefined);
  if (!row || row.used_at || new Date(row.expires_at as string) < new Date()) return null;
  await db.query('UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2', [new Date().toISOString(), row.id as string]);
  return row.user_id as string;
}
