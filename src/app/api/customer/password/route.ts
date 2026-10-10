import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { hashPassword, verifyPassword, passwordMeetsPolicy, revokeAllUserSessions, writeAudit, SESSION_COOKIE } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({ current: z.string().min(1).max(128), next: z.string().min(10).max(128) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  if (!checkRateLimit(`pwdchg:${user.id}`, 5, 15 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if (!passwordMeetsPolicy(parsed.data.next)) return NextResponse.json({ error: 'weak_password' }, { status: 400 });

  const db = getDb();
  const rowRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [user.id]);
  const row = rowRes.rows[0] as { password_hash: string } | undefined;
  if (!row || !(await verifyPassword(parsed.data.current, row.password_hash))) {
    await writeAudit({ actorId: user.id, actorRole: user.role, action: 'password_change_failed', entityType: 'user', entityId: user.id });
    return NextResponse.json({ error: 'wrong_current_password' }, { status: 403 });
  }
  await db.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [await hashPassword(parsed.data.next), new Date().toISOString(), user.id]);
  await revokeAllUserSessions(user.id);
  await writeAudit({ actorId: user.id, actorRole: user.role, action: 'password_changed', entityType: 'user', entityId: user.id });

  const res = NextResponse.json({ ok: true, note: 'All sessions revoked — please log in again.' });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
