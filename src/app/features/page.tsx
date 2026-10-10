import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { CtaBand } from '@/components/CtaBand';

export const metadata: Metadata = {
  title: 'Features & Infrastructure',
  description: 'What every TradeNode VPS includes: trading-focused configurations, cryptocurrency payments with human verification, and transparent specifications.',
};

const FEATURES = [
  { t: 'Trading-focused configurations', d: 'Sized for MetaTrader terminals, indicators, and Expert Advisors — not generic web hosting.' },
  { t: 'Clear, flat monthly pricing', d: 'No surprise bandwidth charges, no per-terminal fees. What you see is what you pay.' },
  { t: 'Cryptocurrency payments', d: 'USDT (TRC20 / ERC20), SOL, BNB, and BTC — with network clearly labeled before you send.' },
  { t: 'Human payment verification', d: 'A person checks every transaction hash and screenshot. No false approvals.' },
  { t: 'Secure credential delivery', d: 'VPS login details are delivered through your encrypted customer dashboard, never email-only.' },
  { t: 'Order status timeline', d: 'Track every step: created → payment → verification → provisioning → ready.' },
  { t: 'Support tickets', d: 'Open technical or billing tickets with message history and unread badges.' },
  { t: 'Renewal reminders', d: 'See your subscription end date and renew before expiry from the dashboard.' },
];

export default async function FeaturesPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';

  return (
    <div className="container-app py-14">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold">{ar ? 'الميزات والبنية التحتية' : 'Features & Infrastructure'}</h1>
        <p className="text-muted mt-3 max-w-2xl text-sm">
          {ar ? 'كل ما تحتاجه لتشغيل منصات التداول عن بُعد — بلا مبالغات ووعود وهمية.' : 'Everything you need to run trading platforms remotely — without exaggeration or fake promises.'}
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <div key={f.t} className="card p-6">
            <h2 className="font-bold mb-2">{f.t}</h2>
            <p className="text-sm text-muted">{f.d}</p>
          </div>
        ))}
      </div>
      <div className="card p-6 mt-8 text-xs text-muted">
        {ar
          ? 'ملاحظة صادقة: المواصفات تمثل مثالاً على الكتالوج حتى تجهيز البنية التحتية الفعلية واختبارها. لا نتظاهر بأن خادماً قد أُنشئ لمجرد الموافقة على الدفع — فهذا يتطلب توفيراً بشرياً حقيقياً.'
          : 'Honest note: specifications represent a catalog example until the actual infrastructure is provisioned and tested. We do not pretend a server exists merely because a payment was approved — real human provisioning is required.'}
      </div>
      <CtaBand
        title={ar ? 'جاهز للبدء؟' : 'Ready to start?'}
        subtitle={ar ? 'خطط من $2 شهرياً مع خصومات تصل إلى 18% على الفوترة السنوية.' : 'Plans from $2/month with up to 18% off annual billing.'}
      />
    </div>
  );
}
