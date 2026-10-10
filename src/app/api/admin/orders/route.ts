import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const db = getDb();
  const status = req.nextUrl.searchParams.get('status');
  const search = req.nextUrl.searchParams.get('q');
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  let sql = `SELECT o.*, u.name AS customer_name, u.email AS customer_email, p.name_en AS plan_name
             FROM orders o JOIN users u ON u.id = o.user_id JOIN plans p ON p.id = o.plan_id WHERE 1=1`;
  const params: unknown[] = [];
  if (status) { sql += ` AND o.status = $${params.length + 1}`; params.push(status); }
  if (search) { sql += ` AND (o.order_number ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1} OR u.name ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
  if (from) { sql += ` AND o.created_at >= $${params.length + 1}`; params.push(from); }
  if (to) { sql += ` AND o.created_at <= $${params.length + 1}`; params.push(`${to}T23:59:59Z`); }
  sql += ` ORDER BY o.created_at DESC LIMIT 200`;

  const res = await db.query(sql, params);
  return NextResponse.json({ orders: res.rows });
}
