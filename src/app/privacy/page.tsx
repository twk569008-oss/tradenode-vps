import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What TradeNode VPS collects, why, how long we keep it, and what third parties see.',
};

export default async function PrivacyPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';

  return (
    <div className="container-app py-14 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-8">{ar ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
      <div className="space-y-5 text-sm text-muted leading-relaxed">
        <div className="card p-6">
          <h2 className="font-bold mb-2">{ar ? 'ما نجمعه' : 'What we collect'}</h2>
          <ul className="space-y-2 list-disc ps-5">
            <li>{ar ? 'الاسم والبريد الإلكتروني كلمة المرور المشفرة (hash).' : 'Your name and email. Your password is stored only as a bcrypt hash.'}</li>
            <li>{ar ? 'الطلبات والمدفوعات التي تقدمها.' : 'Order and payment details you submit (plan, period, transaction hash, screenshot).'}</li>
            <li>{ar ? 'سجلات الدخول والتدقيق لأغراض الأمان.' : 'Login and audit logs for security purposes.'}</li>
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-bold mb-2">{ar ? 'كيف نستخدمه' : 'How we use it'}</h2>
          <p>{ar ? 'لتقديم الخدمة: التحقق من الدفع، تجهيز VPS، التواصل حول طلباتك، ودعمك. لا نستخدم بياناتك للتدريب أو الإعلانات.' : 'To operate the service: verifying payments, provisioning VPS, communicating about your orders, and supporting you. We do not use your data for advertising or AI training.'}</p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold mb-2">{ar ? 'أطراف ثالثة' : 'Third parties'}</h2>
          <p>{ar ? 'نطلب أسعار العملات الرقمية من CoinGecko (مزود مزود بسعر عام لا يستقبل بيانات شخصية). لا نشارك بياناتك مع أي طرف آخر إلا إذا طُلب منا قانوناً.' : 'We query cryptocurrency prices from CoinGecko (a public price API that receives no personal data). We do not share your data with any other party unless required by law.'}</p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold mb-2">{ar ? 'الأمان والاحتفاظ' : 'Security & retention'}</h2>
          <p>{ar ? 'لقطات شاشة الدفع تُخزن بسسرية، وتبيّن فقط للأشخاص المخولين. كلمات المرور تُخزن تشفيرُا bcrypt. تفاصيل تسجيل دخول VPS تُخزن مشفرة AES-256-GCM. تحتفظ ببيانات الطلب طوال عمر اشتراكك ولإثبات المعاملات المالية.' : 'Payment screenshots are stored privately and seen only authorized staff. Passwords are bcrypt-hashed. VPS connection details are AES-256-GCM encrypted at rest. We keep order data as long as your subscription is active and for financial record-keeping.'}</p>
        </div>
        <div className="card p-6">
          <h2 className="font-bold mb-2">{ar ? 'حقوقك' : 'Your rights'}</h2>
          <p>{ar ? 'يمكنك طلب تصحيح أو حذف بياناتك عبر تذكرة دعم. سجلات مالية معينة قد تبقى لسبب قانوني.' : 'You may request correction or deletion of your data via a support ticket. Some financial records may be retained for legal reasons.'}</p>
        </div>
        <p className="text-xs">{ar ? 'آخر تحديث: 2026' : 'Last updated: 2026'}</p>
      </div>
    </div>
  );
}
