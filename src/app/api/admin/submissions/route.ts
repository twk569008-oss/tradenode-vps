import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const status = req.nextUrl.searchParams.get('status');

  const db = getDb();
  let sql = `
    SELECT ps.*, o.order_number, o.status AS order_status, o.user_id AS order_user_id,
           u.name AS customer_name, u.email AS customer_email, p.name_en AS plan_name, p.ram, p.cpu
    FROM payment_submissions ps
    JOIN orders o ON o.id = ps.order_id
    JOIN users u ON u.id = o.user_id
    JOIN plans p ON p.id = o.plan_id`;
  const params: unknown[] = [];
  if (status) { sql += ` WHERE ps.status = $1`; params.push(status); }
  sql += ` ORDER BY ps.submitted_at DESC LIMIT 200`;
  const res = await db.query(sql, params);
  return NextResponse.json({ submissions: res.rows });
}
