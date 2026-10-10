import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { writeAudit } from '@/lib/auth';

const schema = z.object({
  subscriptionId: z.string().min(4).max(64),
  action: z.enum(['extend_days', 'expire_now', 'suspend', 'reactivate', 'set_end_date']),
  days: z.number().int().min(-3650).max(3650).optional(),
  endDate: z.string().max(40).optional(),
  reason: z.string().max(500).optional(),
});

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const res = await getDb().query(
    `SELECT s.*, o.order_number, o.user_id, u.email AS customer_email, u.name AS customer_name
     FROM subscriptions s JOIN orders o ON o.id = s.order_id JOIN users u ON u.id = o.user_id
     ORDER BY s.end_date ASC LIMIT 300`
  );
  return NextResponse.json({ subscriptions: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { subscriptionId, action, days, endDate, reason } = parsed.data;

  const db = getDb();
  const subRes = await db.query('SELECT * FROM subscriptions WHERE id = $1', [subscriptionId]);
  const sub = subRes.rows[0] as Record<string, unknown> | undefined;
  if (!sub) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const now = new Date().toISOString();
  switch (action) {
    case 'extend_days': {
      const d = days == null || days <= 0 ? null : days;
      if (!d) return NextResponse.json({ error: 'days_required' }, { status: 400 });
      const base = new Date(Math.max(new Date(String(sub.end_date)).getTime(), Date.now()));
      const newEnd = new Date(base.getTime() + d * 86400_000).toISOString();
      await db.query('UPDATE subscriptions SET end_date = $1, extended_by_admin = true, updated_at = $2 WHERE id = $3', [newEnd, now, subscriptionId]);
      await db.query('UPDATE vps_instances SET expiration_date = $1 WHERE id = $2', [newEnd, sub.vps_id as string]);
      break;
    }
    case 'set_end_date': {
      const nd = endDate ? parseDate(endDate) : null;
      if (!nd) return NextResponse.json({ error: 'invalid_end_date' }, { status: 400 });
      await db.query('UPDATE subscriptions SET end_date = $1, updated_at = $2 WHERE id = $3', [nd.toISOString(), now, subscriptionId]);
      await db.query('UPDATE vps_instances SET expiration_date = $1 WHERE id = $2', [nd.toISOString(), sub.vps_id as string]);
      break;
    }
    case 'expire_now':
      await db.query(`UPDATE subscriptions SET status = 'expired', updated_at = $1 WHERE id = $2`, [now, subscriptionId]);
      await db.query(`UPDATE vps_instances SET status = 'expired' WHERE id = $1`, [sub.vps_id as string]);
      break;
    case 'suspend':
      await db.query(`UPDATE subscriptions SET status = 'suspended', updated_at = $1 WHERE id = $2`, [now, subscriptionId]);
      await db.query(`UPDATE vps_instances SET status = 'suspended' WHERE id = $1`, [sub.vps_id as string]);
      break;
    case 'reactivate':
      await db.query(`UPDATE subscriptions SET status = 'active', updated_at = $1 WHERE id = $2`, [now, subscriptionId]);
      await db.query(`UPDATE vps_instances SET status = 'active' WHERE id = $1`, [sub.vps_id as string]);
      break;
  }
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: `subscription_${action}`, entityType: 'subscription', entityId: subscriptionId, details: { days, endDate, reason } });
  return NextResponse.json({ ok: true });
}
