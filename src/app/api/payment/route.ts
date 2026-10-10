import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { fetchUsdRate, computeRequiredCrypto } from '@/lib/crypto-rates';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const orderNumber = req.nextUrl.searchParams.get('order');
  if (!orderNumber) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const db = getDb();
  const orderRes = await db.query('SELECT * FROM orders WHERE order_number = $1 AND user_id = $2', [orderNumber, user.id]);
  const order = orderRes.rows[0] as Record<string, unknown> | undefined;
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const networksRes = await db.query('SELECT * FROM payment_networks WHERE is_active = true ORDER BY sort_order ASC');
  const networks = networksRes.rows as Array<Record<string, unknown>>;

  const usd = Number(order.price);
  const nets = [];
  for (const n of networks) {
    const code = n.code as string;
    const rate = await fetchUsdRate(code);
    const required = computeRequiredCrypto(code, usd, rate);
    nets.push({
      code,
      name: n.name_en as string,
      nameAr: n.name_ar as string,
      chain: n.network_chain as string,
      address: n.deposit_address as string,
      confirmations: n.confirmations_required as number,
      requiredAmount: required.ok ? required.amount : null,
      requiredSymbol: required.ok ? required.symbol : null,
      rateUsd: required.ok ? required.rateUsd : null,
    });
  }

  return NextResponse.json({
    order: {
      orderNumber: order.order_number, status: order.status, price: usd, currency: order.currency,
      billing_period: order.billing_period,
    },
    networks: nets,
  });
}
