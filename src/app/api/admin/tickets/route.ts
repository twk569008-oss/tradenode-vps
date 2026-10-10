import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const unread = req.nextUrl.searchParams.get('unread') === '1';
  const db = getDb();
  let sql = `SELECT t.*, u.name AS customer_name, u.email AS customer_email FROM tickets t JOIN users u ON u.id = t.user_id`;
  if (unread) sql += ` WHERE t.unread_admin = true`;
  sql += ` ORDER BY t.updated_at DESC LIMIT 200`;
  const res = await db.query(sql);
  return NextResponse.json({ tickets: res.rows });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null) as { ticketId?: string; status?: string } | null;
  const allowed = ['open', 'answered', 'customer_replied', 'pending_customer', 'resolved', 'closed'];
  if (!body?.ticketId || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  await getDb().query(`UPDATE tickets SET status = $1, updated_at = $2 WHERE id = $3`, [body.status, new Date().toISOString(), body.ticketId]);
  return NextResponse.json({ ok: true });
}
