/**
 * Upload storage abstraction.
 * Local dev: files on disk under tradenode-data/uploads.
 * Netlify/Supabase production: Supabase Storage bucket `tradenode-uploads`
 * (private) accessed with SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { getDb } from '@/db/db';

export type StoredObject = { key: string; mime: string; size: number };

const SUPABASE_URL = () => process.env.SUPABASE_URL || (process.env.DATABASE_URL?.match(/@db\.([a-z0-9]+)\.supabase\.co/)?.[1] ? `https://${process.env.DATABASE_URL!.match(/@db\.([a-z0-9]+)\.supabase\.co/)![1]}.supabase.co` : '');
const SUPABASE_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BUCKET = () => process.env.SUPABASE_UPLOAD_BUCKET || 'tradenode-uploads';

export function isSupabaseStorage(): boolean {
  return Boolean(SUPABASE_URL() && SUPABASE_KEY());
}

/** Persist a validated buffer. Returns the storage key to save in the DB. */
export async function putObject(buf: Buffer, mime: string, keyBase: string): Promise<StoredObject> {
  if (isSupabaseStorage()) {
    const key = `${keyBase}.bin`;
    const url = `${SUPABASE_URL()}/storage/v1/object/${BUCKET()}/${key}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY()}`,
        'Content-Type': mime,
        'x-upsert': 'true',
      },
      body: new Uint8Array(buf),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase upload failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return { key, mime, size: buf.length };
  }

  // Local disk mode
  const fs = await import('fs/promises');
  const path = await import('path');
  const dir = path.join(process.cwd(), 'tradenode-data', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  const key = `${keyBase}.bin`;
  await fs.writeFile(path.join(dir, key), buf);
  return { key, mime, size: buf.length };
}

/** Read an object back by its storage key. */
export async function getObject(key: string): Promise<Buffer | null> {
  if (!/^[a-zA-Z0-9_-]+\.\w+$/.test(key)) return null;

  if (isSupabaseStorage()) {
    const url = `${SUPABASE_URL()}/storage/v1/object/${BUCKET()}/${key}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_KEY()}` } });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  const fs = await import('fs/promises');
  const path = await import('path');
  try {
    return await fs.readFile(path.join(process.cwd(), 'tradenode-data', 'uploads', key));
  } catch {
    return null;
  }
}

/** Delete an object (best-effort, used when removing credentials/proofs). */
export async function deleteObject(key: string): Promise<void> {
  if (!/^[a-zA-Z0-9_-]+\.\w+$/.test(key)) return;
  if (isSupabaseStorage()) {
    const url = `${SUPABASE_URL()}/storage/v1/object/${BUCKET()}/${key}`;
    await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${SUPABASE_KEY()}` } }).catch(() => {});
    return;
  }
  const fs = await import('fs/promises');
  const path = await import('path');
  await fs.unlink(path.join(process.cwd(), 'tradenode-data', 'uploads', key)).catch(() => {});
}

/** Re-export for transactional use in routes. */
export { getDb };
