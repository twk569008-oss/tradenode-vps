import { NextResponse } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const db = getDb();
  const ordersRes = await db.query(
    `SELECT o.id, o.order_number, o.status, o.billing_period, o.price, o.created_at, o.updated_at,
            p.name_en AS plan_name, p.cpu, p.ram, p.storage
     FROM orders o JOIN plans p ON p.id = o.plan_id
     WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [user.id]
  );

  const vpsRes = await db.query(
    `SELECT v.id, v.hostname, v.ip, v.os, v.specs, v.status, v.sent_to_customer, v.expiration_date, o.order_number
     FROM vps_instances v JOIN orders o ON o.id = v.order_id
     WHERE o.user_id = $1 AND v.sent_to_customer = true`,
    [user.id]
  );

  const unreadRes = await db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND is_read = false', [user.id]);
  const notifsRes = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [user.id]);

  const activeSubsRes = await db.query(
    `SELECT s.*, o.order_number FROM subscriptions s JOIN orders o ON o.id = s.order_id
     WHERE o.user_id = $1 AND s.status IN ('active','trial') ORDER BY s.end_date ASC`,
    [user.id]
  );

  return NextResponse.json({
    orders: ordersRes.rows,
    vpsCount: vpsRes.rows.length,
    vps: vpsRes.rows,
    activeSubs: activeSubsRes.rows,
    unreadNotifications: Number((unreadRes.rows[0] as { n: string | number } | undefined)?.n ?? 0),
    notifications: notifsRes.rows,
  });
}
