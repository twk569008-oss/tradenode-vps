'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Tag } from 'lucide-react';

type Plan = {
  id: string; slug: string; name_en: string; name_ar: string; monthly_price: number; billing_periods: string;
  billing_discount_quarterly: number | null; billing_discount_semiannual: number | null; billing_discount_annual: number | null;
  cpu: string; ram: string; storage: string;
};

const PERIODS = [
  { key: 'monthly', months: 1, en: 'Monthly', ar: 'شهري' },
  { key: 'quarterly', months: 3, en: 'Quarterly', ar: 'ربع سنوي' },
  { key: 'semiannual', months: 6, en: 'Semiannual', ar: 'نصف سنوي' },
  { key: 'annual', months: 12, en: 'Annual', ar: 'سنوي' },
] as const;

export function CheckoutClient({ plan, locale, loggedIn }: { plan: Plan; locale: 'en' | 'ar'; loggedIn: boolean }) {
  const ar = locale === 'ar';
  const t = (en: string, arS: string) => (ar ? arS : en);
  const router = useRouter();

  const allowed = plan.billing_periods.split(',').map((s) => s.trim());
  const visiblePeriods = PERIODS.filter((p) => allowed.includes(p.key));

  const [period, setPeriod] = useState<string>(visiblePeriods[0]?.key ?? 'monthly');
  const [coupon, setCoupon] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const chosen = visiblePeriods.find((x) => x.key === period) ?? visiblePeriods[0];
  const discRate =
    period === 'quarterly' ? (plan.billing_discount_quarterly ?? 0) :
    period === 'semiannual' ? (plan.billing_discount_semiannual ?? 0) :
    period === 'annual' ? (plan.billing_discount_annual ?? 0) : 0;

  const base = plan.monthly_price * (chosen?.months ?? 1);
  const total = base * (1 - discRate);

  async function submit() {
    setBusy(true); setNote(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, period, couponCode: coupon.trim() || null }),
      });
      const data = await res.json().catch(() => ({}) as { orderNumber?: string; error?: string });
      if (res.ok && data.orderNumber) {
        router.push(`/payment/${data.orderNumber}`);
        return;
      }
      const msgs: Record<string, string> = {
        auth_required: t('Please log in first.', 'يرجى تسجيل الدخول أولاً.'),
        coupon_invalid: t('Coupon is invalid or expired.', 'القسيمة غير صالحة أو منتهية.'),
        plan_soldout: t('This plan is sold out.', 'هذه الخطة نفدت.'),
        plan_unavailable: t('This plan is not available yet.', 'هذه الخطة غير متاحة بعد.'),
        rate_limited: t('Too many attempts — try later.', 'محاولات كثيرة — حاول لاحقاً.'),
      };
      setNote({ ok: false, text: msgs[data.error as string] ?? t('Something went wrong. Try again.', 'حدث خطأ. حاول مرة أخرى.') });
    } catch {
      setNote({ ok: false, text: t('Network error. Try again.', 'خطأ في الشبكة. حاول مرة أخرى.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Selection card */}
      <div className="card p-6 md:p-7">
        <h2 className="font-bold text-lg mb-5">{t('Your selection', 'اختيارك')}</h2>

        <div className="space-y-2 mb-6 text-sm">
          {[
            { k: t('Plan', 'الخطة'), v: ar ? plan.name_ar : plan.name_en },
            { k: 'CPU', v: plan.cpu },
            { k: t('Memory', 'الذاكرة'), v: plan.ram },
            { k: t('Storage', 'التخزين'), v: plan.storage },
          ].map((r) => (
            <div key={r.k} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2.5" style={{ background: 'var(--bg-2)' }}>
              <span className="text-muted text-xs">{r.k}</span>
              <span className="font-semibold text-sm text-end break-words">{r.v}</span>
            </div>
          ))}
        </div>

        <label className="label mb-3">{t('Billing period', 'فترة الفوترة')}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {visiblePeriods.map((x) => (
            <button key={x.key} type="button" onClick={() => setPeriod(x.key)}
              aria-pressed={period === x.key}
              className="btn btn-secondary !py-2.5 !px-2 text-xs justify-center truncate"
              style={period === x.key
                ? { borderColor: 'var(--accent)', color: 'var(--accent-2)', background: 'var(--accent-soft)' }
                : { color: 'var(--text-2)' }}>
              <span className="truncate">{t(x.en, x.ar)}</span>
            </button>
          ))}
        </div>

        <label className="label mb-2" htmlFor="coupon">{t('Coupon (optional)', 'قسيمة (اختياري)')}</label>
        <div className="relative mb-6">
          <Tag className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
          <input id="coupon" className="input ps-10" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="TRADE10" maxLength={40} dir="ltr" />
        </div>

        <div className="hairline pt-4 space-y-2.5 text-sm">
          <div className="flex justify-between"><span className="text-muted">{t('Subtotal', 'المجموع')}</span><span>${base.toFixed(2)}</span></div>
          {discRate > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">{t('Plan discount', 'خصم الخطة')}</span>
              <span className="text-green-400">−${(base - total).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>{t('Total (USD)', 'الإجمالي (USD)')}</span>
            <span>${total.toFixed(2)}</span>
          </div>
          {chosen && chosen.months > 1 && (
            <p className="text-xs text-muted pt-1">{t(`Billed every ${chosen.months} months`, `تُحاسب كل ${chosen.months} أشهر`)}</p>
          )}
        </div>

        {!loggedIn && (
          <p className="text-xs badge badge-amber mt-4">{t('You must be logged in to create an order.', 'يجب تسجيل الدخول لإنشاء طلب.')}</p>
        )}

        <button onClick={submit} disabled={busy || !loggedIn} className="btn btn-primary w-full justify-center mt-6">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          <span className="truncate">{t('Create order & continue to payment', 'أنشئ الطلب وتابع للدفع')}</span>
        </button>
        {note && <p className={`text-xs badge mt-3 ${note.ok ? 'badge-green' : 'badge-red'}`}>{note.text}</p>}
      </div>

      {/* What happens next */}
      <div className="card p-6 md:p-7 h-fit">
        <h2 className="font-bold text-lg mb-5">{t('What happens next', 'ما يحدث بعد ذلك')}</h2>
        <ol className="space-y-4 text-sm list-none">
          {[
            { t: t('A pending order is created with a unique number.', 'يُنشأ طلب معلّق برقم فريد.') },
            { t: t('Choose a cryptocurrency and network, then send the exact amount.', 'تختار عملة وشبكة، ثم ترسل المبلغ المحدد بالضبط.') },
            { t: t('Upload a payment screenshot and the transaction hash.', 'ترفع لقطة شاشة للدفع ورمز العملية.') },
            { t: t('A human reviews the transaction and approves or rejects it.', 'يراجع شخص العملية ويوافق عليها أو يرفضها.') },
            { t: t('After approval, the VPS is provisioned and delivered via your dashboard.', 'بعد الموافقة، يُجهَّز الخادم ويُسلَّم عبر لوحتك.') },
          ].map((s, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>{i + 1}</span>
              <span className="text-muted leading-relaxed">{s.t}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-lg p-4 text-xs text-muted" style={{ background: 'var(--bg-2)' }}>
          {t('Payments are reviewed by a person. Uploading a screenshot does not mark an order as paid automatically.',
              'تُراجع المدفوعات بواسطة شخص. رفع لقطة الشاشة لا يعني تلقائياً اعتبار الطلب مدفوعاً.')}
        </div>
      </div>
    </div>
  );
}
