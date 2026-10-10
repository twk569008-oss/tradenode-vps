import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';
import { PlansGrid } from '@/components/PlansGrid';
import { ServiceJsonLd } from '@/components/StructuredData';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'VPS Plans — from $3/month',
  description: 'Compare TradeNode VPS plans for MetaTrader, Expert Advisors, and automated trading. Transparent specs, cryptocurrency payments, human verification.',
};

export default async function PlansPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';
  const t = (en: string, arS: string) => (ar ? arS : en);
  const plansRes = await getDb().query('SELECT * FROM plans WHERE is_active = true ORDER BY sort_order ASC');
  const plans = plansRes.rows as never;

  return (
    <div className="container-app py-14">
      <ServiceJsonLd name="TradeNode VPS Plans" url="https://tradenodevps.com/plans" desc="Transparent VPS plans sized for MetaTrader, Expert Advisors, and automated trading. From $2/month." priceFrom={2} />
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold">{t('VPS Plans', 'خطط VPS')}</h1>
        <p className="text-muted mt-3 max-w-2xl mx-auto text-sm">
          {t('Transparent specifications. Monthly, quarterly, semiannual, and annual billing. Every plan is administrator-editable; specifications are illustrative until the underlying infrastructure is provisioned and tested.',
              'مواصفات شفافة. فوترة شهرية وربع سنوية ونصف سنوية وسنوية. كل خطة قابلة للتعديل من الإدارة؛ المواصفات توضيحية حتى تجهيز البنية التحتية واختبارها.')}
        </p>
      </div>
      <PlansGrid plans={plans} locale={locale} />

      <div className="card p-5 mt-10 text-xs text-muted">
        {t('*Terminal-count recommendations are guidance, not guarantees — actual capacity depends on the workload of your charts, indicators, and Expert Advisors. *“Unmetered” bandwidth means we do not resell by the gigabyte; fair use and provider AUPs still apply.',
            '*توصيات عدد الأطراف إرشادية وليست ضماناً — تعتمد السعة الفعلية على أحمال رسومك ومؤشراتك وخبراتك الآلية. *النطاق "غير المحدود" يعني أننا لا نبيع بالجيجابايت؛ يحكم الاستخدام العادل وسياسات المزود.')}
      </div>
    </div>
  );
}
