import { getDb } from '@/db/db';

type Cache = Record<string, { value: string; at: number }>;
const cache = new Map<string, { value: string; at: number }>();
const TTL = 30_000;

/**
 * Postgres mode: settings reads are async (`getSettingAsync`).
 * The old sync `getSetting` now serves cache-only and falls back to the
 * provided default when the key is not cached (first hit on a cold server).
 * Call sites that need guaranteed fresh data use `getSettingAsync`.
 */
export function getSetting(key: string, fallback = ''): string {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  return fallback;
}

export async function getSettingAsync(key: string, fallback = ''): Promise<string> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const res = await getDb().query('SELECT value FROM settings WHERE key = $1', [key]);
  const value = (res.rows[0] as { value?: string } | undefined)?.value ?? fallback;
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await getDb().query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [key, value, new Date().toISOString()]
  );
  cache.delete(key);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const res = await getDb().query('SELECT key, value FROM settings');
  const out: Record<string, string> = {};
  for (const r of res.rows as Array<{ key: string; value: string }>) out[r.key] = r.value;
  cache.clear();
  for (const r of res.rows as Array<{ key: string; value: string }>) cache.set(r.key, { value: r.value, at: Date.now() });
  return out;
}
