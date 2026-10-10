import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { revokeAllUserSessions, writeAudit } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const search = req.nextUrl.searchParams.get('q');
  const db = getDb();
  let sql = `SELECT u.id, u.name, u.email, u.locale, u.role, u.is_active, u.suspended_at, u.created_at, u.last_login_at,
             (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
             FROM users u`;
  const params: unknown[] = [];
  if (search) { sql += ` WHERE (u.name ILIKE $1 OR u.email ILIKE $2)`; const like = `%${search}%`; params.push(like, like); }
  sql += ` ORDER BY u.created_at DESC LIMIT 200`;
  const res = await db.query(sql, params);
  return NextResponse.json({ customers: res.rows });
}

const actionSchema = z.object({ userId: z.string().min(4).max(64), action: z.enum(['suspend', 'reactivate']), reason: z.string().max(500).optional() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { userId, action, reason } = parsed.data;

  const db = getDb();
  const targetRes = await db.query(`SELECT id, role FROM users WHERE id = $1`, [userId]);
  const target = targetRes.rows[0] as { id: string; role: string } | undefined;
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (target.role === 'admin' && action === 'suspend') return NextResponse.json({ error: 'cannot_suspend_admin' }, { status: 400 });

  if (action === 'suspend') {
    await db.query(`UPDATE users SET is_active = false, suspended_at = $1, suspended_reason = $2 WHERE id = $3`, [new Date().toISOString(), reason ?? null, userId]);
    await revokeAllUserSessions(userId);
  } else {
    await db.query(`UPDATE users SET is_active = true, suspended_at = NULL, suspended_reason = NULL WHERE id = $1`, [userId]);
  }
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: `user_${action}d`, entityType: 'user', entityId: userId, details: { reason } });
  return NextResponse.json({ ok: true });
}
