export const CENTS = 100;

export function toCents(v: number): number { return Math.round(v * CENTS); }
export function fromCents(c: number): number { return c / CENTS; }

export type BillingPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export function normalizePeriod(input: string): BillingPeriod {
  switch (input.toLowerCase()) {
    case 'quarterly': case 'quarter': return 'quarterly';
    case 'semiannual': case 'semi-annual': case '6m': return 'semiannual';
    case 'annual': case 'yearly': case 'year': return 'annual';
    case 'monthly': default: return 'monthly';
  }
}

export function periodMonths(p: BillingPeriod): number {
  switch (p) {
    case 'quarterly': return 3;
    case 'semiannual': return 6;
    case 'annual': return 12;
    case 'monthly': default: return 1;
  }
}

export function isPeriodAllowed(p: string, periodsCsv: string): boolean {
  const allowed = periodsCsv.split(',').map((x) => normalizePeriod(x.trim()));
  return allowed.includes(normalizePeriod(p));
}

/**
 * Custom-duration billing: user picks any number of whole months (2–36).
 * Discount tiers mirror the standard periods (often the same for quarterly /
 * semiannual / annual, else 0) so custom lengths stay predictable.
 */
export function customMonthsValid(m: unknown): m is number {
  return typeof m === 'number' && Number.isInteger(m) && m >= 2 && m <= 36;
}

export function discountRateForMonths(
  months: number,
  rates: { quarterly?: number; semiannual?: number; annual?: number }
): number {
  if (months >= 12) return rates.annual ?? 0;
  if (months >= 6) return rates.semiannual ?? 0;
  if (months >= 3) return rates.quarterly ?? 0;
  return 0;
}

/**
 * Returns the *total* upfront price for the given period, applying
 * admin-configured discounts. Never rounds to "nice" numbers — exact math.
 */
export function calculateOrderTotal(opts: {
  monthlyPrice: number;
  period: string;
  periodsCsv: string;
  discountQuarterly?: number; // e.g. 0.05
  discountSemiannual?: number;
  discountAnnual?: number;
  couponPercent?: number;     // 0-100
  couponFixed?: number;       // USD off (applied after percent)
}): { period: BillingPeriod; months: number; base: number; discount: number; coupon: number; total: number } | { error: string } {
  const period = normalizePeriod(opts.period);
  if (!isPeriodAllowed(period, opts.periodsCsv)) return { error: 'billing_period_not_allowed' };
  if (!Number.isFinite(opts.monthlyPrice) || opts.monthlyPrice < 0) return { error: 'invalid_base_price' };

  const months = periodMonths(period);
  const base = toCents(opts.monthlyPrice) * months;

  let discountRate = 0;
  if (period === 'quarterly') discountRate = opts.discountQuarterly ?? 0;
  else if (period === 'semiannual') discountRate = opts.discountSemiannual ?? 0;
  else if (period === 'annual') discountRate = opts.discountAnnual ?? 0;
  if (discountRate < 0 || discountRate > 0.9) return { error: 'invalid_discount' };

  const discount = Math.round(base * discountRate);
  const afterDiscount = base - discount;

  let coupon = 0;
  if (opts.couponPercent && opts.couponPercent > 0) {
    coupon += Math.round(afterDiscount * (opts.couponPercent / 100));
  }
  if (opts.couponFixed && opts.couponFixed > 0) {
    coupon += toCents(opts.couponFixed);
  }
  coupon = Math.min(coupon, afterDiscount);

  const total = Math.max(afterDiscount - coupon, 0);
  return { period, months, base, discount, coupon, total: fromCents(total) };
}

/**
 * Custom-months variant of calculateOrderTotal. Same math, but the period is
 * just "monthly repeated N times" and the discount tier is derived from N.
 */
export function calculateCustomTotal(opts: {
  monthlyPrice: number;
  months: number;
  discountQuarterly?: number;
  discountSemiannual?: number;
  discountAnnual?: number;
  couponPercent?: number;
  couponFixed?: number;
}): { period: 'custom'; months: number; base: number; discount: number; coupon: number; total: number } | { error: string } {
  if (!customMonthsValid(opts.months)) return { error: 'invalid_months' };
  if (!Number.isFinite(opts.monthlyPrice) || opts.monthlyPrice < 0) return { error: 'invalid_base_price' };

  const base = toCents(opts.monthlyPrice) * opts.months;
  const discountRate = discountRateForMonths(opts.months, {
    quarterly: opts.discountQuarterly,
    semiannual: opts.discountSemiannual,
    annual: opts.discountAnnual,
  });
  if (discountRate < 0 || discountRate > 0.9) return { error: 'invalid_discount' };

  const discount = Math.round(base * discountRate);
  const afterDiscount = base - discount;

  let coupon = 0;
  if (opts.couponPercent && opts.couponPercent > 0) {
    coupon += Math.round(afterDiscount * (opts.couponPercent / 100));
  }
  if (opts.couponFixed && opts.couponFixed > 0) {
    coupon += toCents(opts.couponFixed);
  }
  coupon = Math.min(coupon, afterDiscount);

  const total = Math.max(afterDiscount - coupon, 0);
  return { period: 'custom', months: opts.months, base, discount, coupon, total: fromCents(total) };
}

export function formatUsd(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);
}

export function formatUserAmountCrypto(amount: number, symbol: string): string {
  if (!Number.isFinite(amount)) return '—';
  return `${amount.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')} ${symbol}`;
}
