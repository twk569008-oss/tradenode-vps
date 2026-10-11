import { NextResponse } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';

/** GET /api/payment-methods — active networks for wallet top-up (auth required). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const db = getDb();
  const res = await db.query('SELECT code, name_en, name_ar, network_chain, deposit_address FROM payment_networks WHERE is_active = true ORDER BY sort_order ASC');
  return NextResponse.json({
    networks: (res.rows as Array<Record<string, unknown>>).map((n) => ({
      code: n.code,
      label: `${n.name_en}${n.network_chain ? ` (${n.network_chain})` : ''}`,
      labelAr: `${n.name_ar}${n.network_chain ? ` (${n.network_chain})` : ''}`,
      currency: n.code,
      address: n.deposit_address,
    })),
  });
}
