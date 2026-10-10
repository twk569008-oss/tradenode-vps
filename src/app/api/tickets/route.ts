import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const createSchema = z.object({
  subject: z.string().min(5).max(160),
  category: z.enum(['technical', 'connection', 'payment', 'renewal', 'other']),
  message: z.string().min(10).max(4000),
  orderId: z.string().max(64).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const db = getDb();
  const res = await db.query(
    `SELECT id, ticket_number, subject, category, status, unread_admin, unread_customer, created_at, updated_at
     FROM tickets WHERE user_id = $1 ORDER BY updated_at DESC`,
    [user.id]
  );

  return NextResponse.json({ tickets: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  if (!checkRateLimit(`ticket:${user.id}`, 5, 30 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }, { status: 400 });

  const db = getDb();
  let orderId: string | null = null;
  if (parsed.data.orderId) {
    const oRes = await db.query('SELECT id FROM orders WHERE id = $1 AND user_id = $2', [parsed.data.orderId, user.id]);
    const o = oRes.rows[0] as { id: string } | undefined;
    if (!o) return NextResponse.json({ error: 'order_not_found' }, { status: 400 });
    orderId = o.id;
  }

  const id = newId('t');
  const ticketNumber = `TK-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO tickets (id, ticket_number, user_id, order_id, subject, category, status, unread_admin, unread_customer, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'open', true, false, $7, $8)`,
    [id, ticketNumber, user.id, orderId, parsed.data.subject, parsed.data.category, now, now]
  );
  await db.query(
    `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message, created_at) VALUES ($1, $2, $3, 'customer', $4, $5)`,
    [newId('tm'), id, user.id, parsed.data.message, now]
  );

  await writeAudit({ actorId: user.id, actorRole: 'customer', action: 'ticket_created', entityType: 'ticket', entityId: id });
  return NextResponse.json({ ok: true, ticketNumber }, { status: 201 });
}
