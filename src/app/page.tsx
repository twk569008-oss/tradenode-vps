import Link from 'next/link';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';
import { Server, ShieldCheck, Clock, Wallet, Headset, Radar, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { PlansGrid } from '@/components/PlansGrid';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/StructuredData';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';
  const db = getDb();
  const plansRes = await db.query('SELECT * FROM plans WHERE is_active = true ORDER BY sort_order ASC LIMIT 5');
  const plans = plansRes.rows as Array<Record<string, unknown>>;

  const t = (en: string, arS: string) => (ar ? arS : en);

  return (
    <>
      <OrganizationJsonLd name="TradeNode VPS" url="https://tradenodevps.com" logo="https://tradenodevps.com/icon.svg" />
      <WebSiteJsonLd url="https://tradenodevps.com" name="TradeNode VPS" />

      {/* Hero */}
      <section className="container-app pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="badge badge-accent mb-5">{t('Built for traders', 'مصمم للمتداولين')}</span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
              {t('Your Trading Runs. Your VPS Never Sleeps.', 'تداولك يعمل. الـ VPS لا ينام أبداً.')}
            </h1>
            <p className="mt-5 text-lg text-[var(--text-2)] max-w-xl">
              {t('Affordable virtual servers built for MetaTrader, Expert Advisors, and automated trading workflows.',
                  'خوادم افتراضية بأسعار مناسبة، مصممة لمنصة ميتاتريدر والخبرات الآلية وسير عمل التداول الآلي.')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/plans" className="btn btn-primary">{t('Explore VPS Plans', 'استكشف خطط VPS')}</Link>
              <Link href="/how-it-works" className="btn btn-secondary">{t('How It Works', 'كيف يعمل')}</Link>
            </div>
            <p className="mt-4 text-xs text-muted">
              {t('Plans from $2/month. Cryptocurrency payments with human verification.', 'خطط تبدأ من $2 شهرياً. مدفوعات بالعملات الرقمية مع تحقق بشري.')}
            </p>
          </div>

          {/* Server visual — static illustration, no fake live data */}
          <div className="card p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px glow-line" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold">{t('Terminal Snapshot', 'لمحة عن الطرف')}</span>
              <span className="badge badge-green">{t('Illustration', 'توضيحي')}</span>
            </div>
            <div className="space-y-3">
              {[
                { icon: Cpu, label: 'CPU', val: '4 vCPU' },
                { icon: MemoryStick, label: t('Memory', 'الذاكرة'), val: '3–16 GB RAM' },
                { icon: HardDrive, label: t('Storage', 'التخزين'), val: '100 GB SSD' },
                { icon: Server, label: 'MetaTrader', val: 'MT4 · MT5' },
                { icon: Radar, label: 'EA Runtime', val: t('24/5 / 24/7 capable', 'يدعم 24/5 · 24/7') },
              ].map((r, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--bg-2)' }}>
                  <r.icon className="h-4 w-4 text-[var(--accent-2)]" aria-hidden />
                  <span className="text-sm text-[var(--text-2)] flex-1">{r.label}</span>
                  <span className="text-sm font-semibold">{r.val}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              {t('Specifications shown are plan examples — see each plan card for its exact values.', 'المواصفات المعروضة أمثلة على الخطط — راجع بطاقة كل خطة للقيم الدقيقة.')}
            </p>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="container-app pb-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: Cpu, en: 'Trading-focused configurations', ar: 'إعدادات مخصصة للتداول' },
            { icon: Wallet, en: 'Clear monthly pricing', ar: 'أسعار شهرية واضحة' },
            { icon: ShieldCheck, en: 'Manual payment verification', ar: 'تحقق يدوي من الدفع' },
            { icon: Clock, en: 'Human-assisted setup', ar: 'إعداد بمساعدة بشرية' },
            { icon: Radar, en: 'Customer order tracking', ar: 'تتبع حالة الطلب' },
            { icon: Headset, en: 'Responsive support', ar: 'دعم سريع الاستجابة' },
          ].map((f, i) => (
            <div key={i} className="card p-4 flex items-start gap-3">
              <f.icon className="h-4 w-4 text-[var(--accent-2)] mt-0.5 shrink-0" aria-hidden />
              <span className="text-xs font-medium">{t(f.en, f.ar)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className="container-app pb-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">{t('VPS Plans', 'خطط VPS')}</h2>
            <p className="text-muted mt-1 text-sm">{t('Five example plans, editable by the administrator. From $3/month.', 'خمس خطط توضيحية، قابلة للتعديل من لوحة الإدارة. تبدأ من $3 شهرياً.')}</p>
          </div>
          <Link href="/plans" className="text-sm text-[var(--accent-2)] hover:underline">{t('Compare all →', 'مقارنة الكل →')}</Link>
        </div>
        <PlansGrid plans={plans as never} locale={locale} />
      </section>

      {/* Why */}
      <section className="container-app pb-16">
        <div className="card p-8">
          <h2 className="text-2xl font-bold mb-4">{t('Why run your trading platform on a VPS?', 'لماذا تُشغّل منصة التداول على VPS؟')}</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2 text-[var(--accent-2)]">{t('Runs when you are offline', 'تعمل حتى عندما تكون غير متصل')}</h3>
              <p className="text-muted">{t('Your Expert Advisors keep operating on the remote server while your personal computer is off — subject to normal service availability.', 'تعمل الخبرات الآلية على الخادم البعيد بينما جهازك الشخصي مغلق — بشرط توفر الخدمة بشكل طبيعي.')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-[var(--accent-2)]">{t('Remote access anywhere', 'وصول عن بُعد من أي مكان')}</h3>
              <p className="text-muted">{t('Connect from your laptop, tablet, or phone over remote desktop and manage terminals from anywhere.', 'اتصل من الحاسوب أو التابلت أو الهاتف عبر سطح المكتب البعيد وأدر أطرافك من أي مكان.')}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2 text-[var(--accent-2)]">{t('Stable environment', 'بيئة مستقرة')}</h3>
              <p className="text-muted">{t('A dedicated server environment avoids interruptions from desktop sleep settings, updates, or power issues at home.', 'بيئة خادم مخصصة تتجنب انقطاعات إعدادات السكون أو التحديثات أو مشاكل الكهرباء في المنزل.')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container-app pb-16">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">{t('How It Works', 'كيف يعمل')}</h2>
        <div className="grid md:grid-cols-6 gap-3">
          {[
            { n: 1, en: 'Choose a VPS plan', ar: 'اختر خطة VPS' },
            { n: 2, en: 'Create an account', ar: 'أنشئ حساباً' },
            { n: 3, en: 'Pay with cryptocurrency', ar: 'ادفع بعملة رقمية' },
            { n: 4, en: 'Upload the receipt or hash', ar: 'ارفع الإيصال أو رمز العملية' },
            { n: 5, en: 'Wait for verification', ar: 'انتظر التحقق' },
            { n: 6, en: 'Receive VPS details securely', ar: 'استلم تفاصيل VPS بأمان' },
          ].map((s) => (
            <div key={s.n} className="card p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold mb-3" style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>{s.n}</div>
              <p className="text-sm font-medium">{t(s.en, s.ar)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compatibility */}
      <section className="container-app pb-16">
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold mb-3">{t('Compatible with your tools', 'متوافق مع أدواتك')}</h2>
          <p className="text-muted text-sm max-w-2xl mx-auto">
            {t('MetaTrader 4, MetaTrader 5, Expert Advisors, trading scripts, and compatible Windows applications where supported by the underlying infrastructure.',
                'ميتاتريدر 4، ميتاتريدر 5، الخبرات الآلية، سكربتات التداول، وتطبيقات ويندوز المتوافقة بشرط دعم البنية التحتية.')}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {['MetaTrader 4', 'MetaTrader 5', 'Expert Advisors', 'Scripts', 'Custom indicators'].map((c) => (
              <span key={c} className="badge">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container-app pb-20">
        <div className="card card-hover p-10 text-center">
          <h2 className="text-2xl font-bold">{t('Ready to keep your trading running?', 'جاهز لإبقاء تداولك يعمل؟')}</h2>
          <p className="text-muted mt-2 text-sm">{t('Create an account, pick a plan, and pay in minutes.', 'أنشئ حساباً، اختر خطة، وادفع في دقائق.')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/plans" className="btn btn-primary">{t('Order a VPS', 'اطلب VPS')}</Link>
            <Link href="/register" className="btn btn-secondary">{t('Create account', 'أنشئ حساباً')}</Link>
          </div>
        </div>
      </section>
    </>
  );
}
