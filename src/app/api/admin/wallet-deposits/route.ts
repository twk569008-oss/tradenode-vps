import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { writeAudit } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const db = getDb();
  const res = await db.query(
    `SELECT w.*, u.name AS user_name, u.email AS user_email
     FROM wallet_transactions w JOIN users u ON u.id = w.user_id
     WHERE w.type = 'deposit' ORDER BY (w.status = 'pending') DESC, w.created_at DESC LIMIT 200`
  );
  return NextResponse.json({ deposits: res.rows });
}

const actionSchema = z.object({
  depositId: z.string().min(2).max(64),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { depositId, action, reason } = parsed.data;

  const db = getDb();
  const now = new Date().toISOString();
  const r = await db.query(`SELECT * FROM wallet_transactions WHERE id = $1 AND type = 'deposit' AND status = 'pending'`, [depositId]);
  const dep = r.rows[0] as Record<string, unknown> | undefined;
  if (!dep) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (action === 'approve') {
    await db.query(`UPDATE wallet_transactions SET status = 'approved', reviewed_at = $1, reviewer_id = $2 WHERE id = $3`, [now, user.id, depositId]);
    await db.query(`UPDATE users SET wallet_balance = COALESCE(wallet_balance, 0) + $1 WHERE id = $2`, [Number(dep.amount), dep.user_id]);
    await notifyUser({
      userId: dep.user_id as string, type: 'wallet_approved', payload: { amount: Number(dep.amount) },
      emailSubject: 'TradeNode VPS — wallet top-up approved',
      emailBody: `Your wallet deposit of $${Number(dep.amount).toFixed(2)} has been approved. Your balance is ready to use.`,
    });
    await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'wallet_deposit_approved', entityType: 'wallet_tx', entityId: depositId, details: { amount: dep.amount }, ip: req.headers.get('x-forwarded-for') ?? 'unknown' });
  } else {
    await db.query(`UPDATE wallet_transactions SET status = 'rejected', reviewed_at = $1, reviewer_id = $2, note = COALESCE(note,'') || $3`, [now, user.id, `;reason=${reason ?? ''}`.slice(0, 200)]);
    await notifyUser({
      userId: dep.user_id as string, type: 'wallet_rejected', payload: { amount: Number(dep.amount), reason: reason ?? null },
      emailSubject: 'TradeNode VPS — wallet top-up rejected',
      emailBody: `Your wallet deposit of $${Number(dep.amount).toFixed(2)} was rejected. Reason: ${reason ?? 'not stated'}.`,
    });
    await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'wallet_deposit_rejected', entityType: 'wallet_tx', entityId: depositId, details: { reason }, ip: req.headers.get('x-forwarded-for') ?? 'unknown' });
  }
  return NextResponse.json({ ok: true });
}
