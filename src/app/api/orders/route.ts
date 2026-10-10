import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';
import { normalizePeriod, isPeriodAllowed, calculateOrderTotal, calculateCustomTotal, customMonthsValid } from '@/lib/money';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  planId: z.string().min(2).max(64),
  period: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'custom']),
  months: z.number().int().optional().nullable(), // only for period = 'custom'
  couponCode: z.string().max(40).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`order:${user.id}`, 10, 10 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { planId, period, couponCode } = parsed.data;
  const months = parsed.data.months ?? null;

  const db = getDb();
  const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
  const plan = planRes.rows[0] as Record<string, unknown> | undefined;
  if (!plan) return NextResponse.json({ error: 'plan_not_found' }, { status: 404 });
  if (!plan.is_active) return NextResponse.json({ error: 'plan_unavailable' }, { status: 400 });
  if (plan.is_soldout) return NextResponse.json({ error: 'plan_soldout' }, { status: 400 });

  if (period !== 'custom' && !isPeriodAllowed(period, String(plan.billing_periods ?? 'monthly'))) {
    return NextResponse.json({ error: 'period_not_allowed' }, { status: 400 });
  }
  if (period === 'custom' && !customMonthsValid(months)) {
    return NextResponse.json({ error: 'period_not_allowed' }, { status: 400 });
  }

  let coupon: { code: string; percent: number; fixed: number } | null = null;
  if (couponCode) {
    const cRes = await db.query(
      `SELECT * FROM coupons WHERE lower(code) = lower($1) AND is_active = true
       AND (expires_at IS NULL OR expires_at > $2) AND (max_uses IS NULL OR used_count < max_uses)`,
      [couponCode, new Date().toISOString()]
    );
    const c = cRes.rows[0] as Record<string, unknown> | undefined;
    if (!c) return NextResponse.json({ error: 'coupon_invalid' }, { status: 400 });
    coupon = { code: String(c.code), percent: c.discount_type === 'percent' ? Number(c.discount_value) : 0, fixed: c.discount_type === 'fixed' ? Number(c.discount_value) : 0 };
  }

  const discountRates = {
    discountQuarterly: plan.billing_discount_quarterly != null ? Number(plan.billing_discount_quarterly) : 0,
    discountSemiannual: plan.billing_discount_semiannual != null ? Number(plan.billing_discount_semiannual) : 0,
    discountAnnual: plan.billing_discount_annual != null ? Number(plan.billing_discount_annual) : 0,
    couponPercent: coupon?.percent ?? 0,
    couponFixed: coupon?.fixed ?? 0,
  };

  const total = period === 'custom'
    ? calculateCustomTotal({ monthlyPrice: Number(plan.monthly_price), months: months as number, ...discountRates })
    : calculateOrderTotal({ monthlyPrice: Number(plan.monthly_price), period, periodsCsv: String(plan.billing_periods ?? ''), ...discountRates });

  if ('error' in total) return NextResponse.json({ error: total.error }, { status: 400 });

  const id = newId('ord');
  const orderNumber = `TN-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
  const now = new Date().toISOString();
  const billingPeriodLabel = period === 'custom' ? `custom_${months}m` : normalizePeriod(period);
  await db.query(
    `INSERT INTO orders (id, order_number, user_id, plan_id, billing_period, price, currency, status, coupon_code, discount_amount, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'USD', 'pending_payment', $7, $8, $9, $10)`,
    [id, orderNumber, user.id, planId, billingPeriodLabel, total.total, coupon?.code ?? null, total.coupon, now, now]
  );

  if (coupon) {
    await db.query('UPDATE coupons SET used_count = used_count + 1 WHERE lower(code) = lower($1)', [coupon.code]);
  }

  await writeAudit({ actorId: user.id, actorRole: 'customer', action: 'order_created', entityType: 'order', entityId: id, details: { planId, period: billingPeriodLabel, total: total.total }, ip });
  return NextResponse.json({ ok: true, orderId: id, orderNumber, total: total.total, months: total.months }, { status: 201 });
}
