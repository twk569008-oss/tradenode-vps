import { NextResponse } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const db = getDb();
  const one = async (sql: string, params: unknown[] = []): Promise<number> => {
    const r = await db.query(sql, params);
    const row = r.rows[0] as { n?: string | number } | undefined;
    return row?.n != null ? Number(row.n) : 0;
  };

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    customers, totalOrders, pendingReview, approvedThisMonth, awaitingVps,
    activeSubs, expiringSoon, revenueVerified, openTickets,
  ] = await Promise.all([
    one(`SELECT COUNT(*) AS n FROM users WHERE role = 'customer'`),
    one(`SELECT COUNT(*) AS n FROM orders`),
    one(`SELECT COUNT(*) AS n FROM orders WHERE status IN ('payment_submitted','under_review')`),
    one(`SELECT COUNT(*) AS n FROM payment_submissions WHERE status = 'approved' AND reviewed_at >= $1`, [monthStart.toISOString()]),
    one(`SELECT COUNT(*) AS n FROM orders WHERE status IN ('payment_approved','awaiting_vps','vps_provisioning')`),
    one(`SELECT COUNT(*) AS n FROM subscriptions WHERE status IN ('active','trial') AND end_date > $1`, [new Date().toISOString()]),
    one(`SELECT COUNT(*) AS n FROM subscriptions WHERE status = 'active' AND end_date BETWEEN $1 AND $2`, [new Date().toISOString(), new Date(Date.now() + 7 * 86400_000).toISOString()]),
    one(`SELECT COALESCE(SUM(amount_usd), 0) AS n FROM payment_submissions WHERE status = 'approved'`),
    one(`SELECT COUNT(*) AS n FROM tickets WHERE status IN ('open','customer_replied') AND unread_admin = true`),
  ]);

  const recentRes = await db.query(
    `SELECT a.action, a.entity_type, a.entity_id, a.created_at, u.name AS actor_name, u.role AS actor_role
     FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.created_at DESC LIMIT 15`
  );

  return NextResponse.json({
    stats: {
      customers, totalOrders, pendingReview, approvedThisMonth, awaitingVps,
      activeSubs, expiringSoon, revenueVerified, openTickets,
    },
    recentActivity: recentRes.rows,
  });
}
