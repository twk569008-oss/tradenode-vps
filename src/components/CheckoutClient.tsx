'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Tag, LogIn, ShieldCheck, Wallet } from 'lucide-react';

type Plan = {
  id: string; slug: string; name_en: string; name_ar: string; monthly_price: number; billing_periods: string;
  billing_discount_quarterly: number | null; billing_discount_semiannual: number | null; billing_discount_annual: number | null;
  cpu: string; ram: string; storage: string;
};

const PERIODS = [
  { key: 'monthly', months: 1, en: 'Monthly', ar: 'شهري' },
  { key: 'custom', months: 0, en: 'Custom months', ar: 'مدة مخصصة' },
  { key: 'quarterly', months: 3, en: 'Quarterly', ar: 'ربع سنوي' },
  { key: 'semiannual', months: 6, en: 'Semiannual', ar: 'نصف سنوي' },
  { key: 'annual', months: 12, en: 'Annual', ar: 'سنوي' },
] as const;

export function CheckoutClient({ plan, locale, loggedIn }: { plan: Plan; locale: 'en' | 'ar'; loggedIn: boolean }) {
  const ar = locale === 'ar';
  const t = (en: string, arS: string) => (ar ? arS : en);
  const router = useRouter();

  const allowed = plan.billing_periods.split(',').map((s) => s.trim());
  const visiblePeriods: Array<{ key: string; months: number; en: string; ar: string }> = [
    ...PERIODS.filter((p) => p.key !== 'custom' && allowed.includes(p.key)),
    { key: 'custom', months: 0, en: 'Custom months', ar: 'مدة مخصصة' },
  ];

  const [period, setPeriod] = useState<string>(visiblePeriods[0]?.key ?? 'monthly');
  const [customMonths, setCustomMonths] = useState<number>(4);
  const [coupon, setCoupon] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [payWithWallet, setPayWithWallet] = useState(false);

  const chosen = visiblePeriods.find((x) => x.key === period) ?? visiblePeriods[0];
  const effectiveMonths = period === 'custom' ? customMonths : (chosen?.months ?? 1);
  const discRate =
    period === 'custom'
      ? (customMonths >= 12 ? (plan.billing_discount_annual ?? 0) : customMonths >= 6 ? (plan.billing_discount_semiannual ?? 0) : customMonths >= 3 ? (plan.billing_discount_quarterly ?? 0) : 0)
      : period === 'quarterly' ? (plan.billing_discount_quarterly ?? 0) :
      period === 'semiannual' ? (plan.billing_discount_semiannual ?? 0) :
      period === 'annual' ? (plan.billing_discount_annual ?? 0) : 0;

  const base = plan.monthly_price * effectiveMonths;
  const total = base * (1 - discRate);

  useEffect(() => {
    if (!loggedIn) { setWalletBalance(null); return; }
    fetch('/api/wallet').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && typeof d.balance === 'number') setWalletBalance(d.balance);
    }).catch(() => {});
  }, [loggedIn]);

  const canPayWithWallet = walletBalance !== null && walletBalance >= total;

  async function submit() {
    if (!loggedIn) { setShowLoginModal(true); return; }
    setBusy(true); setNote(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, period, months: period === 'custom' ? customMonths : null, couponCode: coupon.trim() || null, payFromWallet: payWithWallet }),
      });
      const data = await res.json().catch(() => ({}) as { orderNumber?: string; error?: string });
      if (res.ok && data.orderNumber) {
        router.push(data.paidWithWallet ? `/payment/${data.orderNumber}?fromWallet=1` : `/payment/${data.orderNumber}`);
        return;
      }
      const msgs: Record<string, string> = {
        auth_required: t('Please log in first.', 'يرجى تسجيل الدخول أولاً.'),
        coupon_invalid: t('Coupon is invalid or expired.', 'القسيمة غير صالحة أو منتهية.'),
        plan_soldout: t('This plan is sold out.', 'هذه الخطة نفدت.'),
        plan_unavailable: t('This plan is not available yet.', 'هذه الخطة غير متاحة بعد.'),
        rate_limited: t('Too many attempts — try later.', 'محاولات كثيرة — حاول لاحقاً.'),
        insufficient_balance: t('Wallet balance is not enough — deposit first or pay with crypto.', 'رصيد المحفظة غير كافٍ — اشحنها أولاً أو ادفع بالعملة الرقمية.'),
      };
      setNote({ ok: false, text: msgs[data.error as string] ?? t('Something went wrong. Try again.', 'حدث خطأ. حاول مرة أخرى.') });
      if (data.error === 'auth_required') setShowLoginModal(true);
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
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
        {period === 'custom' && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <label className="text-sm text-muted" htmlFor="customMonths">{t('Duration (months, 2–36):', 'المدة بالأشهر (٢–٣٦):')}</label>
            <input id="customMonths" type="number" min={2} max={36} step={1}
              className="input !w-24 text-center" value={customMonths}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n)) setCustomMonths(Math.min(36, Math.max(2, n)));
              }} dir="ltr" />
            <span className="text-xs text-muted">{customMonths >= 12
              ? t('Annual discount applied', 'خصم سنوي مطبق')
              : customMonths >= 6 ? t('Semiannual discount applied', 'خصم نصف سنوي مطبق')
              : customMonths >= 3 ? t('Quarterly discount applied', 'خصم ربع سنوي مطبق') : ''}</span>
          </div>
        )}

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
          {effectiveMonths > 1 && (
            <p className="text-xs text-muted pt-1">{t(`Billed every ${effectiveMonths} months`, `تُحاسب كل ${effectiveMonths} أشهر`)}</p>
          )}
        </div>

        {!loggedIn && (
          <div className="mt-4 rounded-xl p-4 text-sm" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
            <p className="font-semibold mb-1">{t('Almost there — one quick step', 'خطوة واحدة بسيطة ويصبح طلبك جاهزاً')}</p>
            <p className="text-muted text-xs mb-3">{t('Create an account (or log in) to continue to payment — your plan selection is saved.', 'أنشئ حساباً (أو سجّل دخولك) للمتابعة إلى الدفع — اختيار الخطة محفوظ لدينا.')}</p>
            <div className="flex gap-2 flex-wrap">
              <a href={`/login?next=/checkout/${plan.slug}`} className="btn btn-primary !py-2 !px-4 text-xs">{t('Log in', 'تسجيل الدخول')}</a>
              <a href={`/register?next=/checkout/${plan.slug}`} className="btn btn-secondary !py-2 !px-4 text-xs">{t('Create account', 'إنشاء حساب')}</a>
            </div>
          </div>
        )}

        {loggedIn && walletBalance !== null && (
          <div className="mt-4 rounded-xl p-4" style={{ background: canPayWithWallet ? 'rgba(52,211,153,0.08)' : 'var(--bg-2)', border: '1px solid ' + (canPayWithWallet ? 'rgba(52,211,153,0.45)' : 'var(--stroke-2)') }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="radio" name="payMethod" checked={!payWithWallet} onChange={() => setPayWithWallet(false)} className="mt-1" style={{ accentColor: 'var(--accent)' }} />
              <div className="flex-1">
                <p className="font-semibold text-sm">{t('Pay with cryptocurrency', 'الدفع بعملة رقمية')}</p>
                <p className="text-xs text-muted mt-0.5">{t('USDT / SOL / BNB / BTC — send the exact amount and upload the receipt.', 'USDT / SOL / BNB / BTC — أرسل المبلغ بالضبط وارفع الإيصال.')}</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer mt-3">
              <input type="radio" name="payMethod" checked={payWithWallet} onChange={() => setPayWithWallet(true)} disabled={!canPayWithWallet} className="mt-1" style={{ accentColor: 'var(--accent)' }} />
              <div className="flex-1">
                <p className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                  <Wallet className="h-4 w-4" aria-hidden /> {t('Pay from my wallet', 'الدفع من محفظتي')}
                  <span className={`badge ${canPayWithWallet ? 'badge-green' : 'badge-amber'} !py-0 text-xs`}>${walletBalance!.toFixed(2)}</span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {canPayWithWallet
                    ? t('Instant — the order is confirmed immediately, no waiting for review.', 'فوري — يؤكد الطلب مباشرة بدون انتظار المراجعة.')
                    : t('Balance insufficient — deposit first to use this option.', 'الرصيد غير كافٍ — اشحن المحفظة أولاً لاستخدام هذا الخيار.')}
                </p>
              </div>
            </label>
          </div>
        )}

        <button onClick={submit} disabled={busy || !loggedIn} className="btn btn-primary w-full justify-center mt-6">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          <span className="truncate">{payWithWallet && canPayWithWallet ? t('Pay now from wallet', 'ادفع الآن من المحفظة') : t('Create order & continue to payment', 'أنشئ الطلب وتابع للدفع')}</span>
        </button>
        {note && <p className={`text-xs badge mt-3 ${note.ok ? 'badge-green' : 'badge-red'}`}>{note.text}</p>}
      </div>

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

      {/* Guest login-required modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4,8,16,0.72)' }} role="dialog" aria-modal="true">
          <div className="card p-7 max-w-sm w-full text-center" style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
              <LogIn className="h-7 w-7 text-[var(--accent-2)]" aria-hidden />
            </div>
            <h3 className="font-bold text-lg mb-2">{t('Log in to complete your order', 'سجّل دخولك لإكمال طلبك')}</h3>
            <p className="text-muted text-sm mb-5">
              {t('Your plan selection is saved. Create an account or log in — it takes less than a minute.',
                 'اختيار خطتك محفوظ. أنشئ حساباً أو سجّل دخولك — يستغرق أقل من دقيقة.')}
            </p>
            <div className="space-y-2">
              <a href={`/login?next=/checkout/${plan.slug}`} className="btn btn-primary w-full justify-center">{t('Log in', 'تسجيل الدخول')}</a>
              <a href={`/register?next=/checkout/${plan.slug}`} className="btn btn-secondary w-full justify-center">
                <ShieldCheck className="h-4 w-4" aria-hidden /> {t('Create account', 'إنشاء حساب')}
              </a>
              <button onClick={() => setShowLoginModal(false)} className="text-xs text-muted hover:underline pt-1">
                {t('Keep browsing', 'متابعة التصفح')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
