'use client';

import { Check, Circle, Loader2, Clock } from 'lucide-react';

const STEPS = [
  { key: 'created', en: 'Order Created', ar: 'تم إنشاء الطلب' },
  { key: 'submitted', en: 'Payment Submitted', ar: 'تم إرسال الدفعة' },
  { key: 'verified', en: 'Payment Verified', ar: 'تم التحقق من الدفعة' },
  { key: 'provisioning', en: 'VPS Provisioning', ar: 'جارٍ تجهيز الخادم' },
  { key: 'ready', en: 'VPS Ready', ar: 'الخادم جاهز' },
  { key: 'active', en: 'Active', ar: 'نشط' },
];

function stageFor(status: string): number {
  switch (status) {
    case 'pending_payment': return 0;
    case 'payment_submitted': case 'under_review': return 1;
    case 'payment_approved': case 'awaiting_vps': return 2;
    case 'vps_provisioning': return 3;
    case 'active': return 5;
    case 'vps_ready': return 4;
    default: return 0;
  }
}

export function OrderTimeline({ status, locale }: { status: string; locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const current = stageFor(status);

  if (['payment_rejected', 'cancelled', 'expired'].includes(status)) {
    return (
      <div className="card p-4 text-sm" style={{ borderColor: 'rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.06)' }}>
        {ar ? 'الطلب غير نشط: ' : 'Order not active: '}
        <strong>{status}</strong>
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {STEPS.map((s, i) => {
        const done = i < current;
        const now = i === current;
        const pending = i > current;
        return (
          <li key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              {done ? <Check className="h-5 w-5 text-green-400" aria-hidden />
                : now ? (status === 'under_review' || status === 'vps_provisioning' ?
                    <Loader2 className="h-5 w-5 text-[var(--accent-2)] animate-spin" aria-hidden /> :
                    <Clock className="h-5 w-5 text-[var(--accent-2)]" aria-hidden />)
                  : <Circle className="h-5 w-5 text-muted" aria-hidden />}
              {i < STEPS.length - 1 && <div className="w-px flex-1 my-1" style={{ background: done ? 'var(--accent)' : 'var(--stroke-1)' }} />}
            </div>
            <div className="pb-5">
              <div className={`text-sm ${now ? 'font-bold' : done ? 'font-semibold' : 'text-muted'}`}>{ar ? s.ar : s.en}</div>
              {now && <div className="text-xs text-[var(--accent-2)] mt-1">{ar ? 'المرحلة الحالية' : 'Current stage'}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
