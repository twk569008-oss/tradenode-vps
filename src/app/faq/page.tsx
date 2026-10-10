import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { CtaBand } from '@/components/CtaBand';
import { FaqJsonLd } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Answers about payments, cryptocurrency verification, VPS delivery, capacity, and renewals at TradeNode VPS.',
};

const QA = [
  { q: 'How do I pay?', a: 'Choose your plan, create an account, and pay with USDT (TRC20 or ERC20), SOL, BNB, or BTC. The exact deposit address and required amount appear during checkout.' },
  { q: 'How long does payment verification take?', a: 'A human reviews every transaction. Typical review happens within our administrator-configured delivery window, but timings are not guaranteed and may vary.' },
  { q: 'When will my VPS be ready?', a: 'After payment approval, the administrator provisions your server manually. You receive connection details in your dashboard — we never fake readiness.' },
  { q: 'How many MetaTrader terminals can I run?', a: 'Each plan shows suggested terminal ranges. These are guidance — real capacity depends on your charts, indicators, and Expert Advisors. We do not guarantee specific benchmark numbers.' },
  { q: 'Can I get a refund?', a: 'Refunds follow our published Refund Policy. Please read it before ordering — manual cryptocurrency payments have specific recovery constraints.' },
  { q: 'Do you ask for my wallet seed phrase?', a: 'Never. We only need a transaction hash or screenshot proving your payment. Anyone asking for seed phrases or private keys is not us.' },
  { q: 'What happens when my subscription expires?', a: 'You can renew from your dashboard. If a subscription lapses, the administrator may suspend the VPS until payment resumes.' },
  { q: 'Is my payment screenshot private?', a: 'Yes. Proofs are stored privately and accessible only to you and the review team — never publicly.' },
];

export default async function FaqPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';
  return (
    <div className="container-app py-14 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-10">{ar ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h1>
      <FaqJsonLd faqs={QA} />
      <div className="space-y-3">
        {QA.map((x) => (
          <details key={x.q} className="card p-5">
            <summary className="font-semibold text-sm cursor-pointer">{x.q}</summary>
            <p className="text-sm text-muted mt-3">{x.a}</p>
          </details>
        ))}
      </div>
      <CtaBand title={ar ? 'لم تجد إجابتك؟' : "Didn't find your answer?"} subtitle={ar ? 'افتح تذكرة دعم من لوحة حسابك.' : 'Open a support ticket from your dashboard.'} cta={ar ? 'استكشف الخطط' : undefined} />
    </div>
  );
}
