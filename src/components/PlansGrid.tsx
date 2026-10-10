'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Cpu, MemoryStick, HardDrive, Check, Zap, Rocket, Star } from 'lucide-react';

type Plan = {
  id: string; slug: string; name_en: string; name_ar: string; tagline_en: string | null; tagline_ar: string | null;
  cpu: string; ram: string; storage: string; bandwidth: string | null; monthly_price: number;
  billing_periods: string; billing_discount_quarterly: number | null; billing_discount_semiannual: number | null; billing_discount_annual: number | null;
  capacity_title_en: string | null; capacity_title_ar: string | null; best_for_en: string | null; best_for_ar: string | null;
  is_active: number; is_soldout: number; featured: number;
};

/** Simple per-plan illustrated header (no fabricated data — decorative only). */
function PlanArt({ ram }: { ram: string }) {
  const num = parseInt(ram, 10) || 4;
  const bars = Math.min(Math.max(Math.round(num / 2), 2), 8);
  const hot = num >= 12;
  const Icon = hot ? Rocket : num >= 8 ? Star : Zap;
  const color = hot ? '#d9962e' : num >= 8 ? '#f5c451' : 'var(--accent-2)';
  return (
    <div className="rounded-xl mb-5 px-4 pt-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }} aria-hidden>
      <div className="flex items-end gap-1.5 h-14">
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${30 + ((i * 37) % 65)}%`, background: i % 3 === 2 ? '#e05260' : 'var(--accent)', opacity: 0.85 }} />
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 pb-2.5">
        <Icon className="h-4 w-4" style={{ color }} aria-hidden />
        <span className="text-[10px]" style={{ color }}>MT4 · MT5 · EA</span>
      </div>
    </div>
  );
}

const PERIODS = [
  { key: 'monthly', months: 1, disc: 0 },
  { key: 'quarterly', months: 3, disc: 'billing_discount_quarterly' },
  { key: 'semiannual', months: 6, disc: 'billing_discount_semiannual' },
  { key: 'annual', months: 12, disc: 'billing_discount_annual' },
] as const;

export function PlansGrid({ plans, locale }: { plans: Plan[]; locale: 'en' | 'ar' }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('monthly');
  const ar = locale === 'ar';
  const t = (en: string, arS: string) => (ar ? arS : en);

  const active = PERIODS.find((p) => p.key === period)!;

  function priceFor(p: Plan): { total: number; perMonth: number; discPct: number } {
    const months = active.months;
    const discKey = active.disc;
    const discRate = discKey ? (p[discKey] ?? 0) : 0;
    const base = p.monthly_price * months;
    const total = base * (1 - discRate);
    return { total, perMonth: total / months, discPct: Math.round(discRate * 100) };
  }

  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl p-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-colors"
              style={period === p.key ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-2)' }}
            >
              {t(p.key === 'monthly' ? 'Monthly' : p.key === 'quarterly' ? 'Quarterly' : p.key === 'semiannual' ? 'Semiannual' : 'Annual',
                p.key === 'monthly' ? 'شهري' : p.key === 'quarterly' ? 'ربع سنوي' : p.key === 'semiannual' ? 'نصف سنوي' : 'سنوي')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const pr = priceFor(p);
          const name = ar ? (p.name_ar || p.name_en) : p.name_en;
          const tagline = ar ? p.tagline_ar : p.tagline_en;
          const capacity = ar ? p.capacity_title_ar : p.capacity_title_en;
          const bestFor = ar ? p.best_for_ar : p.best_for_en;
          return (
            <div key={p.id} className="card card-hover p-6 flex flex-col relative" style={p.featured ? { borderColor: 'var(--accent)' } : undefined}>
              {p.featured ? (
                <span className="badge badge-accent absolute top-4 end-4">{t('Popular', 'الأكثر طلباً')}</span>
              ) : null}
              <PlanArt ram={String(p.ram)} />
              <h3 className="text-lg font-bold">{name}</h3>
              {tagline ? <p className="text-xs text-muted mt-1 mb-4">{tagline}</p> : <div className="mb-4" />}

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-extrabold">${pr.perMonth.toFixed(2)}</span>
                <span className="text-xs text-muted">/ {t('mo', 'شهر')}</span>
              </div>
              {period !== 'monthly' && pr.discPct > 0 && (
                <p className="text-xs mb-1 badge badge-green self-start">{t(`Save ${pr.discPct}%`, `وفّر ${pr.discPct}%`)}</p>
              )}
              {period !== 'monthly' && (
                <p className="text-xs text-muted mb-4">{t(`Billed $${pr.total.toFixed(2)} every ${active.months} months`, `تُحاسب $${pr.total.toFixed(2)} كل ${active.months} أشهر`)}</p>
              )}
              {period === 'monthly' && <div className="mb-4" />}

              <ul className="space-y-2 text-sm mb-5">
                <li className="flex items-center gap-2"><Cpu className="h-4 w-4 text-[var(--accent-2)]" aria-hidden /><span>{p.cpu}</span></li>
                <li className="flex items-center gap-2"><MemoryStick className="h-4 w-4 text-[var(--accent-2)]" aria-hidden /><span>{p.ram} {t('RAM', 'ذاكرة')}</span></li>
                <li className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-[var(--accent-2)]" aria-hidden /><span>{p.storage}</span></li>
                {capacity && <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-400" aria-hidden /><span>{capacity}</span></li>}
              </ul>

              {bestFor && <p className="text-xs text-muted mb-5 mt-auto">{t('Best for:', 'الأفضل لـ:')} {bestFor}</p>}

              {p.is_soldout ? (
                <button disabled className="btn btn-secondary w-full justify-center">{t('Sold out', 'نفدت الخطة')}</button>
              ) : p.is_active ? (
                <Link href={`/checkout/${p.slug}?period=${period}`} className="btn btn-primary w-full justify-center">{t('Order now', 'اطلب الآن')}</Link>
              ) : (
                <button disabled className="btn btn-secondary w-full justify-center">{t('Unavailable', 'غير متاحة')}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
