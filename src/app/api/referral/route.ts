import { NextResponse } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

/** GET /api/referral — current user's referral code, balance, and history. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const db = getDb();
  const r = await db.query(
    `SELECT referral_code, referral_balance FROM users WHERE id = $1`,
    [user.id]
  );
  const row = r.rows[0] as { referral_code: string; referral_balance: string } | undefined;

  const earns = await db.query(
    `SELECT re.order_number, re.amount, re.created_at, u.name AS buyer_name
     FROM referral_earnings re JOIN users u ON u.id = re.buyer_user_id
     WHERE re.earner_user_id = $1 ORDER BY re.created_at DESC LIMIT 50`,
    [user.id]
  );

  const count = await db.query(
    `SELECT count(*) AS total FROM users WHERE referred_by = $1`,
    [user.id]
  );

  return NextResponse.json({
    code: row?.referral_code ?? null,
    balance: Number(row?.referral_balance ?? 0),
    totalReferrals: Number((count.rows[0] as { total: string }).total ?? 0),
    earnings: earns.rows,
  });
}
