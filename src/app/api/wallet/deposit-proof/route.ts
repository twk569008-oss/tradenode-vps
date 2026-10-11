import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { putObject } from '@/lib/storage';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_SIZE = 6 * 1024 * 1024;

/** POST /api/wallet/deposit-proof — attach a screenshot to a pending wallet deposit. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const depositId = form?.get('depositId');
  const file = form?.get('proof');
  if (!form || typeof depositId !== 'string' || !(file instanceof File)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type) || file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'unsupported_file' }, { status: 400 });
  }

  const db = getDb();
  const row = await db.query(`SELECT id, user_id FROM wallet_transactions WHERE id = $1 AND user_id = $2`, [depositId, user.id]);
  if (row.rows.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const buf = Buffer.from(await file.arrayBuffer());
  const stored = await putObject(buf, file.type, `wallet-proofs/${user.id}/${depositId}`);

  await db.query(`UPDATE wallet_transactions SET note = COALESCE(note,'') || ';screenshot=${stored.key.replace(/;/g, '')}' WHERE id = $1`, [depositId]);
  return NextResponse.json({ ok: true });
}
