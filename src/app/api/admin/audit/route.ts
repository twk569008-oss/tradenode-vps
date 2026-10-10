import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const page = Math.max(0, Number(req.nextUrl.searchParams.get('page') ?? 0));
  const size = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('size') ?? 50)));
  const action = req.nextUrl.searchParams.get('action');

  const db = getDb();
  let sql = `SELECT a.*, u.name AS actor_name, u.email AS actor_email FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id`;
  const params: unknown[] = [];
  if (action) { sql += ` WHERE a.action = $1`; params.push(action); }
  sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(size, page * size);
  const rowsRes = await db.query(sql, params);

  const totalRes = await db.query(`SELECT COUNT(*) AS n FROM audit_logs${action ? ' WHERE action = $1' : ''}`, action ? [action] : []);
  const total = Number((totalRes.rows[0] as { n: string | number } | undefined)?.n ?? 0);

  return NextResponse.json({ logs: rowsRes.rows, total, page, size });
}
