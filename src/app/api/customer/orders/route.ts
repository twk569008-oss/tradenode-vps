import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const db = getDb();
  const number = req.nextUrl.searchParams.get('number');

  if (number) {
    const orderRes = await db.query(
      `SELECT o.*, p.name_en AS plan_name_en, p.name_ar AS plan_name_ar, p.cpu, p.ram, p.storage, p.os AS plan_os
       FROM orders o JOIN plans p ON p.id = o.plan_id
       WHERE o.order_number = $1 AND o.user_id = $2`,
      [number, user.id]
    );
    const order = orderRes.rows[0] as Record<string, unknown> | undefined;
    if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const [submissions, invoices, vps] = await Promise.all([
      db.query(
        `SELECT id, network_code, transaction_hash, amount_usd, screenshot_mime, screenshot_size, submitted_at, status, reviewer_note
         FROM payment_submissions WHERE order_id = $1 ORDER BY submitted_at DESC`,
        [order.id as string]
      ),
      db.query(`SELECT s.*, o.order_number FROM subscriptions s JOIN orders o ON o.id = s.order_id WHERE s.order_id = $1`, [order.id as string]),
      db.query(`SELECT * FROM vps_instances WHERE order_id = $1 AND sent_to_customer = true`, [order.id as string]),
    ]);

    return NextResponse.json({ order, submissions: submissions.rows, subscription: invoices.rows[0] ?? null, vps: vps.rows[0] ?? null });
  }

  const ordersRes = await db.query(
    `SELECT o.id, o.order_number, o.status, o.billing_period, o.price, o.created_at, o.updated_at, o.payment_network,
            p.name_en AS plan_name, p.cpu, p.ram, p.storage
     FROM orders o JOIN plans p ON p.id = o.plan_id
     WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [user.id]
  );
  return NextResponse.json({ orders: ordersRes.rows });
}
