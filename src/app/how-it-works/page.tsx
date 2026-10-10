import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { CtaBand } from '@/components/CtaBand';
import { TriangleAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works',
  description: 'Six straightforward steps from choosing a plan to receiving your VPS connection details.',
};

export default async function HowItWorksPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';

  const steps = [
    { t: 'Choose a VPS plan', d: 'Compare plans by CPU, RAM, storage, and MetaTrader capacity.' },
    { t: 'Create an account', d: 'A simple, validated form — no unnecessary data collected.' },
    { t: 'Pay with cryptocurrency', d: 'USDT (TRC20/ERC20), SOL, BNB, or BTC. Network clearly labeled.' },
    { t: 'Upload receipt or hash', d: 'Screenshot plus transaction hash speeds up verification.' },
    { t: 'Wait for human verification', d: 'A person reviews every transaction before your order advances.' },
    { t: 'Receive VPS details', d: 'Connection info appears securely in your dashboard when provisioning completes.' },
  ];

  return (
    <div className="container-app py-14">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-10">{ar ? 'كيف يعمل' : 'How It Works'}</h1>
      <div className="grid md:grid-cols-3 gap-4 mb-10">
        {steps.map((s, i) => (
          <div key={i} className="card p-6">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-bold mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>{i + 1}</div>
            <h2 className="font-bold mb-2">{s.t}</h2>
            <p className="text-sm text-muted">{s.d}</p>
          </div>
        ))}
      </div>
      <div className="card p-6 flex gap-3 items-start" style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.06)' }}>
        <TriangleAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
        <div className="text-sm">
          <strong>{ar ? 'تحذير الدفع' : 'Payment safety'}</strong>
          <p className="text-muted text-xs mt-1">
            {ar ? 'الإرسال عبر شبكة خاطئة قد يؤدي إلى فقدان الأموال نهائياً. لا نطلب أبداً عبارات الاسترداد أو المفاتيح الخاصة.' : 'Sending on the wrong network may cause permanent loss of funds. We never ask for seed phrases or private keys.'}
          </p>
        </div>
      </div>
      <CtaBand title={ar ? 'ابدأ الآن' : 'Start now'} subtitle={ar ? 'أنشئ حساباً واختر خطتك في دقائق.' : 'Create an account and pick a plan in minutes.'} cta={ar ? 'استكشف الخطط' : undefined} />
    </div>
  );
}
