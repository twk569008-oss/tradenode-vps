import { NextResponse, type NextRequest } from 'next/server';
import z from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId } from '@/lib/auth';
import { queueEmail } from '@/lib/notify';

/** GET /api/wallet — current balance + transaction history for the logged-in user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const db = getDb();
  const bal = await db.query('SELECT COALESCE(wallet_balance, 0) AS balance FROM users WHERE id = $1', [user.id]);
  const tx = await db.query(
    `SELECT id, type, amount, status, order_number, note, created_at FROM wallet_transactions
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [user.id]
  );
  return NextResponse.json({
    balance: Number((bal.rows[0] as { balance: string })?.balance ?? 0),
    transactions: tx.rows,
  });
}

const depositSchema = z.object({
  amountUsd: z.number().min(1).max(5000),
  networkCode: z.string().trim().min(2).max(16),
  transactionHash: z.string().trim().max(200).optional(),
});

/** POST /api/wallet — create a pending deposit request for admin approval. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const parsed = depositSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { amountUsd, networkCode, transactionHash } = parsed.data;

  const db = getDb();
  const id = newId('wtx');
  const now = new Date().toISOString();
  await db.query(
    `INSERT INTO wallet_transactions (id, user_id, type, amount, status, note, created_at)
     VALUES ($1, $2, 'deposit', $3, 'pending', $4, $5)`,
    [id, user.id, amountUsd, `network=${networkCode};tx=${transactionHash ?? 'screenshot-only'}`, now]
  );

  // Notify admin email (goes to email_log; delivered if configured) + audit
  const adminRes = await db.query(`SELECT email FROM users WHERE role = 'admin' LIMIT 1`);
  const adminEmail = (adminRes.rows[0] as { email?: string } | undefined)?.email;
  if (adminEmail) {
    await queueEmail({
      toEmail: adminEmail,
      subject: `💳 Wallet deposit request — ${user.name} / $${amountUsd.toFixed(2)}`,
      body: `User ${user.name} (${user.email}) requested a wallet deposit of $${amountUsd.toFixed(2)} via ${networkCode}. Tx: ${transactionHash ?? '(screenshot uploaded)'}. Review it in the admin panel → Wallet deposits.`,
    });
  }

  return NextResponse.json({ ok: true, depositId: id }, { status: 201 });
}
