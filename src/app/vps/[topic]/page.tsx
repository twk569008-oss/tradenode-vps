import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { CtaBand } from '@/components/CtaBand';
import { ServiceJsonLd, FaqJsonLd } from '@/components/StructuredData';

type Topic = {
  slug: string;
  h1: string; h1Ar: string;
  desc: string; descAr: string;
  metaTitle: string; metaDesc: string;
  why: string[]; whyAr: string[];
  faqs: Array<{ q: string; a: string }>;
  faqsAr: Array<{ q: string; a: string }>;
};

const TOPICS: Topic[] = [
  {
    slug: 'forex-vps',
    h1: 'Forex VPS for Around-the-Clock Trading',
    h1Ar: 'خادم VPS للفوركس لتداول يعمل على مدار الساعة',
    desc: 'Run your MetaTrader terminals and Expert Advisors on a remote server so your strategy keeps operating while your computer is off — subject to service availability.',
    descAr: 'شغّل أطراف MetaTracker والخبرات الآلية على خادم بعيد حتى تعمل استراتيجيتك بينما جهازك مغلق — بشرط توفر الخدمة.',
    metaTitle: 'Forex VPS — Reliable Servers for MetaTrader Traders',
    metaDesc: 'Affordable Forex VPS from $2/month. Built for MetaTrader, EAs, and automated strategies. Cryptocurrency payments, human verification.',
    why: [
      'Trading platforms stay online when your local machine is off — 24/5 for forex sessions, subject to service availability.',
      'No interruptions from local power cuts, internet hiccups, or desktop system updates.',
      'Connect via remote desktop from laptop, tablet, or phone.',
      'Plans sized by how many terminals and heavy indicators you actually run.',
    ],
    whyAr: [
      'تبقى منصات التداول متصلة بينما جهازك المحلي مغلق — 24/5 لجلسات الفوركس، بشرط توفر الخدمة.',
      'لا انقطاعات بسبب انقطاع الكهرباء المحلي أو ضعف الإنترنت أو تحديثات النظام.',
      'اتصل عبر سطح المكتب البعيد من الحاسوب أو التابلت أو الهاتف.',
      'خطط متناسبة مع عدد الأطراف والمؤشرات التي تستخدمها فعلاً.',
    ],
    faqs: [
      { q: 'Can I run MT4 and MT5 together?', a: 'Yes, within your plan’s capacity range. Each terminal consumes CPU and RAM; check the plan card for suggested counts.' },
      { q: 'Is a Windows license included?', a: 'Only when the underlying infrastructure and licensing support it — each plan card states what applies.' },
    ],
    faqsAr: [
      { q: 'أستطيع تشغيل MT4 و MT5 معاً؟', a: 'نعم، ضمن سعة خطتك. كل طرف يستهلك CPU و RAM؛ راجع بطاقة الخطة للأعداد الموصى بها.' },
      { q: 'هل ترخيص Windows مشمول؟', a: 'فقط عندما تدعم البنية التحتية والترخيص ذلك — كل بطاقة خطة توضح ما ينطبق.' },
    ],
  },
  {
    slug: 'mt4-vps',
    h1: 'MetaTrader 4 VPS — Keep Your EAs Running',
    h1Ar: 'خادم MetaTrader 4 — أبقِ خبراتك الآلية تعمل',
    desc: 'MetaTrader 4 hosting sized for Expert Advisors, custom indicators, and long-running chart sessions — without depending on your home computer.',
    descAr: 'استضافة MetaTracker 4 بحجم مناسب للخبرات الآلية والمؤشرات المخصصة وجلسات الرسوم الطويلة — دون الاعتماد على جهازك المنزلي.',
    metaTitle: 'MetaTrader 4 VPS — Hosting for MT4 Expert Advisors',
    metaDesc: 'MT4 VPS from $2/month sized for EAs and indicators. Continuous remote operation with human-verified crypto payments.',
    why: [
      'MT4 stays connected to your broker’s server throu تسجيل دخول مستمر — لا تداول ضائع بسبب نوم جهازك.',
      'Multiple MT4 instances supported within the plan’s suggested terminal range.',
      'Remote desktop access lets you manage charts from anywhere.',
    ],
    whyAr: [
      'MT4 يبقى متصلاً بخادم وسيطك باستمرار — لا فرص ضائعة بسبب سكون جهازك.',
      'دعم عدة نسخ من MT4 ضمن النطاق الموصى به للخطة.',
      'سطح المكتب البعيد يتيح إدارة الرسوم من أي مكان.',
    ],
    faqs: [
      { q: 'How many MT4 terminals fit on Starter Trader?', a: '1–2 terminals are suggested depending on chart count, indicator weight, and EA load. Heavier setups need a larger plan.' },
      { q: 'Can I install my own EAs?', a: 'Yes. You get a standard remote desktop, so you install your MetaTracker and files just as on a local PC.' },
    ],
    faqsAr: [
      { q: 'كم طرف MT4 يدخل في خطة المبتدئ؟', a: 'يُوصى بـ1–2 طرف حسب عدد الرسوم وثقل المؤشرات وحمل الخبرة. الإعدادات الأثقل تحتاج خطة أكبر.' },
      { q: 'أستطيع تثبيت خبراتي الخاصة؟', a: 'نعم. تحصل على سطح مكتب بعيد قياسي، فتثبّت MetaTracker وملفاتك كما على حاسوبك المحلي.' },
    ],
  },
  {
    slug: 'mt5-vps',
    h1: 'MetaTrader 5 VPS — Multi-Asset Automated Hosting',
    h1Ar: 'خادم MetaTracker 5 — استضافة آلية متعددة الأصول',
    desc: 'MetaTrader 5 brings more order types, built-in strategy testing, and multi-asset coverage. Our VPS keeps it online around the clock.',
    descAr: 'MetaTracker 5 يوفر أنواع طلبات أكثر واختبار استراتيجيات مدمجاً وتغطية أصول متعددة. خوادمنا تُبقيه متصلاً على مدار الساعة.',
    metaTitle: 'MetaTrader 5 VPS — Hosting for MT5 and Algo Trading',
    metaDesc: 'MT5 VPS designed for algorithmic trading and strategy testers — transparent specs from $2/month.',
    why: [
      'MT5’s strategy tester and multi-chart workloads benefit from stable, allocation-consistent resources.',
      'Run MT5 alongside MT4 within the same plan’s capacity range.',
      'Remote access for tuning EAs and reviewing tester reports.',
    ],
    whyAr: [
      'اختبار الاستراتيجيات في MT5 والأحمال متعددة الرسوم تستفيد من موارد ثابتة ومتسقة.',
      'شغّل MT5 بجانب MT4 ضمن نطاق سعة الخطة نفسها.',
      'وصول بعيد لضبط الخبرات ومراجعة تقارير الاختبار.',
    ],
    faqs: [
      { q: 'Does MT5 use more resources than MT4?', a: 'Typically yes — MT5 charts and multi-asset tools are heavier. Consider Trader Plus or above for multiple MT5 charts.' },
      { q: 'Can I run the strategy tester overnight?', a: 'Yes — the server keeps working when your local machine is off, subject to service availability.' },
    ],
    faqsAr: [
      { q: 'هل يستهلك MT5 موارد أكثر من MT4؟', a: 'عادةً نعم — رسوم MT5 وأدواته الأثقل. فكر في Trader Plus أو أعلى لرسوم MT5 متعددة.' },
      { q: 'أستطيع تشغيل اختبار الاستراتيجية ليلياً؟', a: 'نعم — الخادم يواصل العمل بينما جهازك المحلي مغلق، بشرط توفر الخدمة.' },
    ],
  },
  {
    slug: 'xauusd-scalping-vps',
    h1: 'XAUUSD Scalping VPS — Low-Friction Gold Trading',
    h1Ar: 'خادم سكالبنج XAUUSD — تداول الذهب بأقل احتكاك',
    desc: 'Gold scalping demands responsiveness from your platform and your connection. Our VPS keeps MetaTracker running continuously so you are not racing your own hardware.',
    descAr: 'سكالبنج الذهب يتطلب استجابة من منصتك واتصالك. خوادمنا تُبقي MetaTracker يعمل باستمرار حتى لا تتنافس مع عتادك.',
    metaTitle: 'XAUUSD Scalping VPS — Hosting for Gold Traders',
    metaDesc: 'VPS plans for gold (XAUUSD) scalping. Continuous MT4/MT5 operation, transparent capacity guidance.',
    why: [
      'Terminal stays connected through volatile sessions without local interruption risks.',
      'Scalper Pro and EA Power plans sized for heavier chart and EA workloads.',
      'We make no latency or slippage promises — those depend on your broker and network.',
    ],
    whyAr: [
      'الطرف يبقى متصلاً خلال الجلسات المتقلبة دون مخاطر الانقطاع المحلي.',
      'خطتا Scalper Pro و EA Power بحجم مناسب للأحمال الأثقل.',
      'لا نقدم وعوداً بالزمن الممتاز أو السبيب — تلك تعتمد على وسيطك وشبكتك.',
    ],
    faqs: [
      { q: 'Do you guarantee low latency for scalping?', a: 'No. We do not invent latency numbers; actual results depend on your broker’s server location and your own connection. We do guarantee the server runs continuously.' },
      { q: 'Which plan suits gold scalping?', a: 'Scalper Pro (8 GB, 4 vCPU) is designed for heavier multi-terminal setups. lighter setups can start smaller and upgrade.' },
    ],
    faqsAr: [
      { q: 'هل تضمنون زمن استجابة منخفضاً للسكالبنج؟', a: 'لا. لا نخترع أرقام الزمن؛ النتائج الفعلية تعتمد على موقع خادم وسيطك واتصالك. ما نضمنه هو استمرارية الخادم.' },
      { q: 'أي خطة تناسب سكالبنج الذهب؟', a: 'Scalper Pro (8 GB، 4 وحدات معالجة) مصممة للإعدادات الأثقل متعددة الأطراف. الإعدادات الأخف يمكن أن تبدأ أصغر وتترقي.' },
    ],
  },
  {
    slug: 'ea-vps',
    h1: 'Expert Advisor & Trading Bot VPS',
    h1Ar: 'خادم للخبرات الآلية وروبوتات التداول',
    desc: 'EA Power and Scalper Pro plans are sized for bots that run many charts, heavy indicators, or multiple strategies at once.',
    descAr: 'خطتا EA Power و Scalper Pro بحجم مناسب للروبوتات التي تشغّل رسوماً كثيرة أو مؤشرات ثقيلة أو استراتيجيات متعددة معاً.',
    metaTitle: 'Expert Advisors VPS — Automated Trading Hosting',
    metaDesc: 'VPS hosting for EAs and trading bots — 16 GB/6 vCPU top plan, from $2/month. No automation promises, just capacity.',
    why: [
      'Continuous operation so scheduled bots and session-based strategies keep running.',
      'Top plan offers 6 vCPU / 16 GB for resource-intensive setups, subject to performance testing.',
      'One dashboard to track your subscription status and renewals.',
    ],
    whyAr: [
      'استمرارية التشغيل للروبوتات المجدولة والاستراتيجيات الجلسية.',
      'الخطة الأعلى توفر 6 وحدات / 16 GB للإعدادات مكثفة الموارد، بشرط اختبار الأداء.',
      'لوحة واحدة لتتبع حالة الاشتراك والتجديدات.',
    ],
    faqs: [
      { q: 'Can I install third-party EAs I purchased?', a: 'Yes — it is a standard remote desktop. You install files the same way as on a local machine.' },
      { q: 'Do you promise specific backtest results?', a: 'No. Capacity suggestions assume typical EA workloads; we do not promise backtest or live results.' },
    ],
    faqsAr: [
      { q: 'أستطيع تثبيت خبرات آلية اشتريتها؟', a: 'نعم — إنه سطح مكتب بعيد قياسي. تثبّت الملفات كما على جهازك المحلي.' },
      { q: 'هل تعدون بنتائج اختبار محددة؟', a: 'لا. اقتراحات السعة تفترض أحمال EA نموذجية؛ لا نعد بنتائج اختبار أو تشغيل مباشر.' },
    ],
  },
  {
    slug: 'windows-vps',
    h1: 'Windows VPS for Trading Tools',
    h1Ar: 'خادم Windows لأدوات التداول',
    desc: 'Compatible Windows environments where the infrastructure and licensing support it — useful for MetaTracker and desktop trading utilities.',
    descAr: 'بيئات Windows متوافقة حيث تدعمها البنية التحتية والترخيص — مفيدة لـMetaTracker وأدوات التداول المكتبية.',
    metaTitle: 'Windows VPS for Trading — MetaTrader-Ready Hosting',
    metaDesc: 'Windows-capable VPS plans for MetaTracker and compatible trading tools. Transparent OS notes on every plan.',
    why: [
      'Each plan states exactly which OS applies given the actual infrastructure.',
      'Remote desktop connection with a dedicated username and temporary password (delivered securely).',
      'Runs standard trading software compatible with the OS provided.',
    ],
    whyAr: [
      'كل خطة توضح بدقة أي نظام ينطبق حسب البنية التحتية الفعلية.',
      'اتصال سطح مكتب بعيد باسم مستخدم وكلمة مرور مؤقتة (تُسلَّم بأمان).',
      'يشغّل برامج التداول القياسية المتوافقة مع النظام المقدَّم.',
    ],
    faqs: [
      { q: 'Is Windows Server the default on every plan?', a: 'Only where actual infrastructure and licensing support it. Each plan says exactly what applies — we do not promise OS options we cannot deliver.' },
    ],
    faqsAr: [
      { q: 'هل Windows Server هو الافتراضي في كل الخطط؟', a: 'فقط حيث تدعم البنية التحتية والترخيص ذلك. كل خطة توضح ما ينطبق — لا نعد بخيارات نظام لا نستطيع توفيها.' },
    ],
  },
];

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  const t = TOPICS.find((x) => x.slug === topic);
  if (!t) return { title: 'Not found' };
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    openGraph: { title: t.metaTitle, description: t.metaDesc, type: 'website' },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const t = TOPICS.find((x) => x.slug === topic);
  if (!t) notFound();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';

  return (
    <div className="container-app py-14 max-w-4xl">
      <ServiceJsonLd name={ar ? t.h1Ar : t.h1} url={`https://tradenodevps.com/vps/${t.slug}`} desc={ar ? t.descAr : t.desc} priceFrom={2} />
      <FaqJsonLd faqs={ar ? (t.faqsAr ?? t.faqs) : t.faqs} />

      <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{ar ? t.h1Ar : t.h1}</h1>
      <p className="text-muted text-sm mb-10 max-w-2xl">{ar ? t.descAr : t.desc}</p>

      <div className="card p-6 mb-8">
        <h2 className="font-bold mb-4 text-lg">{ar ? 'لماذا هذا الخادم؟' : 'Why this matters'}</h2>
        <ul className="space-y-2 text-sm list-disc ps-5 text-muted">
          {(ar ? t.whyAr : t.why).map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>

      <div className="card p-6 mb-8">
        <h2 className="font-bold mb-4 text-lg">{ar ? 'أسئلة شائعة حول هذا' : 'Common questions'}</h2>
        <div className="space-y-2">
          {(ar ? t.faqsAr : t.faqs).map((f) => (
            <details key={f.q} className="rounded-lg p-4" style={{ background: 'var(--bg-2)' }}>
              <summary className="text-sm font-semibold cursor-pointer">{f.q}</summary>
              <p className="text-sm text-muted mt-2">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="card p-6 flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted">{ar ? 'خطط مناسبة تبدأ من $2/شهر مع خصومات سنوية.' : 'Matching plans from $2/month with annual discounts.'}</p>
        <Link href="/plans" className="btn btn-primary text-sm">{ar ? 'قارن الخطط' : 'Compare plans →'}</Link>
      </div>

      <CtaBand title={ar ? 'جاهز لتجربته؟' : 'Ready to try it?'} subtitle={ar ? 'أنشئ حساباً واختر خطتك في دقائق.' : 'Create an account and pick a plan in minutes.'} cta={ar ? 'استكشف الخطط' : undefined} />
    </div>
  );
}
