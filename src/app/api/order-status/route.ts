import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`status:${ip}`, 12, 10 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const orderNumber = req.nextUrl.searchParams.get('order')?.trim();
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!orderNumber || !email) return NextResponse.json({ error: 'not_found_or_mismatch' }, { status: 400 });

  const db = getDb();
  const res = await db.query(
    `SELECT o.status, o.price, o.created_at, p.name_en AS plan
     FROM orders o JOIN users u ON u.id = o.user_id JOIN plans p ON p.id = o.plan_id
     WHERE o.order_number = $1 AND u.email = $2`,
    [orderNumber, email]
  );
  const row = res.rows[0] as { status: string; price: number; created_at: string; plan: string } | undefined;

  if (!row) return NextResponse.json({ error: 'not_found_or_mismatch' }, { status: 404 });
  return NextResponse.json({
    order: { status: row.status, price: Number(row.price), created_at: row.created_at, plan: row.plan },
  });
}
