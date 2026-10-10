import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({ message: z.string().min(1).max(4000) });

async function loadTicket(ticketId: string, userId: string, role: string) {
  const res = await getDb().query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
  const t = res.rows[0] as Record<string, unknown> | undefined;
  if (!t) return null;
  if (role !== 'admin' && t.user_id !== userId) return null; // customer isolation
  return t;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ ticketId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  const { ticketId } = await ctx.params;
  const t = await loadTicket(ticketId, user.id, user.role);
  if (!t) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const db = getDb();
  const messagesRes = await db.query(
    `SELECT m.*, u.name AS sender_name FROM ticket_messages m JOIN users u ON u.id = m.sender_id WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [ticketId]
  );

  if (user.role === 'admin') await db.query('UPDATE tickets SET unread_admin = false WHERE id = $1', [ticketId]);
  else await db.query('UPDATE tickets SET unread_customer = false WHERE id = $1', [ticketId]);

  return NextResponse.json({
    ticket: { subject: t.subject, category: t.category, status: t.status, ticket_number: t.ticket_number, created_at: t.created_at },
    messages: messagesRes.rows,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ ticketId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  if (!checkRateLimit(`msg:${user.id}`, 20, 10 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { ticketId } = await ctx.params;
  const t = await loadTicket(ticketId, user.id, user.role);
  if (!t) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const db = getDb();
  const now = new Date().toISOString();
  await db.query(`INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, [newId('tm'), ticketId, user.id, user.role, parsed.data.message, now]);

  if (user.role === 'admin') {
    await db.query(`UPDATE tickets SET status = 'answered', unread_customer = true, unread_admin = false, updated_at = $1 WHERE id = $2`, [now, ticketId]);
    // Notify customer
    const customerRes = await db.query('SELECT id, email FROM users WHERE id = $1', [t.user_id as string]);
    const customer = customerRes.rows[0] as { id: string; email: string } | undefined;
    if (customer) {
      await notifyUser({ userId: customer.id, type: 'ticket_reply', payload: { ticketNumber: t.ticket_number }, emailSubject: 'TradeNode VPS — support replied', emailBody: 'Your support ticket has a new reply. Log in to view it.', toEmail: customer.email });
    }
  } else {
    await db.query(`UPDATE tickets SET status = 'customer_replied', unread_customer = false, unread_admin = true, updated_at = $1 WHERE id = $2`, [now, ticketId]);
    const adminsRes = await db.query(`SELECT id, email FROM users WHERE role = 'admin'`);
    for (const a of adminsRes.rows as Array<{ id: string; email: string }>) {
      await notifyUser({ userId: a.id, type: 'ticket_new_message', payload: { ticketNumber: t.ticket_number }, emailSubject: 'TradeNode VPS — customer replied', emailBody: `Ticket ${t.ticket_number} has a customer reply.`, toEmail: a.email });
    }
  }

  await writeAudit({ actorId: user.id, actorRole: user.role, action: 'ticket_message_added', entityType: 'ticket', entityId: ticketId });
  return NextResponse.json({ ok: true }, { status: 201 });
}
