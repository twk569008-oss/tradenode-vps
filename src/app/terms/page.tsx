import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TradeNode VPS terms: what the service provides, verification, delivery, capacity honesty, acceptable use, and liability limits.',
};

const SECTIONS: Array<{ en: string; ar: string; itemsEn: string[]; itemsAr: string[] }> = [
  {
    en: '1. The service', ar: '1. الخدمة',
    itemsEn: [
      'TradeNode VPS provides virtual private servers for running trading software such as MetaTrader and compatible Windows tools, subject to actual infrastructure availability.',
      'Specifications shown are catalog examples until the administrator provisions and tests the actual infrastructure for each plan.',
      'We do not provide trading advice, signals, or guaranteed trading outcomes.',
    ],
    itemsAr: [
      'توفر TradeNode VPS خوادم افتراضية خاصة لتشغيل برامج التداول مثل MetaTracker والتطبيقات المتوافقة مع Windows، بشرط توفر البنية التحتية الفعلية.',
      'المواصفات المعروضة تمثل أمثلة على الكتالوج حتى يقوم المسؤول بتوفير واختبار البنية التحتية الفعلية لكل خطة.',
      'نحن لا نقدم نصائح تداول، إشارات، أو نتائج تداول مضمونة.',
    ],
  },
  {
    en: '2. Accounts', ar: '2. الحسابات',
    itemsEn: [
      'You are responsible for keeping your login secure. Accounts are personal; sharing credentials is discouraged.',
      'We may suspend accounts that violate these terms, attempt fraud, or abuse the service — with a recorded reason in our audit trail.',
    ],
    itemsAr: [
      'أنت مسؤول عن الحفاظ على أمان تسجيل الدخول. الحسابات شخصية؛ ولا نشجع مشاركة بيانات الدخول.',
      'قد نعلق الحسابات التي تنتهك هذه الشروط أو تحاول الاحتيال أو تؤذي الخدمة — مع تسجيل السبب في سجل التدقيق.',
    ],
  },
  {
    en: '3. Payments & verification', ar: '3. الدفعات والتحقق',
    itemsEn: [
      'Payments are made by cryptocurrency. A human verifies every transfer before your order is marked as paid.',
      'Uploading a screenshot does not automatically approve an order. Rejected payments can be appealed via a support ticket.',
      'Sending on the wrong network may cause permanent, unrecoverable loss of funds.',
    ],
    itemsAr: [
      'تتم الدفعات بالعملات المشفرة. يتم التحقق من كل عملية تحويل بشكل بشري قبل اعتبار الطلب مدفوعاً.',
      'رفع لقطة شاشة لا يعني تلقائياً الموافقة على الطلب. يمكن استئناف الدفعات المرفوضة عبر تذكرة دعم.',
      'الإرسال عبر الشبكة الخاطئة قد يسبب فقداناً دائماً وغير قابل للاسترداد للأموال.',
    ],
  },
  {
    en: '4. Provisioning & renewal', ar: '4. التجهيز والتجديد',
    itemsEn: [
      'VPS delivery is manual and begins after payment approval. Estimated delivery windows are guidance, not guaranteed times.',
      'Subscriptions renew from your dashboard. Expired subscriptions may be suspended until payment resumes.',
    ],
    itemsAr: [
      'تجهيز VPS يتم يدوياً ويبدأ بعد الموافقة على الدفع. نطاقات التوفير المقدرة هي إرشاد، ليست أوقاتاً مضمونة.',
      'تجديد الاشتراكات يتم عبر لوحة حسابك. الاشتراكات المنتهية قد تُعلق حتى استئناف الدفع.',
    ],
  },
  {
    en: '5. Acceptable use', ar: '5. الاستخدام المقبول',
    itemsEn: [
      'No spam, no illegal content, no resource abuse beyond your plan allocation, no attacks on other tenants.',
      'MetaTrader capacity guidance is advisory — sustained heavy loads may require a larger plan.',
    ],
    itemsAr: [
      'لا رسائل غير مرغوبة، ولا محتوى غير قانوني، ولا إساءة استخدام للموارد تتجاوز تخصيص خطتك، ولا هجمات على مستخدمين آخرين.',
      'توصيات سعة MetaTracker إرشادية — الأحمال الثقيلة المستمرة قد تتطلب خطة أكبر.',
    ],
  },
  {
    en: '6. Liability', ar: '6. المسؤولية',
    itemsEn: [
      'The service is provided “as is”. We are not liable for trading losses, missed opportunities, or platform outages beyond what the Refund Policy explicitly covers.',
    ],
    itemsAr: [
      'تُقدم الخدمة “كما هي”. لسنا مسؤولين عن خسائر التداول أو الفرص المفقودة أو انقطاعات المنصة بما يزيد على ما تغطيه سياسة الاسترداد صراحةً.',
    ],
  },
];

export default async function TermsPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';
  return (
    <div className="container-app py-14 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-8">{ar ? 'شروط الخدمة' : 'Terms of Service'}</h1>
      {SECTIONS.map((s) => (
        <section key={s.en} className="card p-6 mb-4">
          <h2 className="font-bold mb-3">{ar ? s.ar : s.en}</h2>
          <ul className="text-sm text-muted space-y-2 list-disc ps-5">
            {(ar ? s.itemsAr : s.itemsEn).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
