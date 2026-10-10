import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { TriangleAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'When TradeNode VPS issues refunds on cryptocurrency payments and under what conditions refunds are not possible.',
};

export default async function RefundPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';

  return (
    <div className="container-app py-14 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-8">{ar ? 'سياسة الاسترداد' : 'Refund Policy'}</h1>

      <div className="card p-6 mb-5" style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.06)' }}>
        <div className="flex gap-3 items-start">
          <TriangleAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm">
            <strong>{ar ? 'مهم' : 'Important'}</strong>
            <span className="text-muted text-xs block mt-1">
              {ar ? 'مدفوعات العملات المشفرة غير قابلة للعكس بطبيعتها. استرداد العملة المشفرة يتم حين يكون ذلك ممكناً تقنياً وبقرار المسؤول.' : 'Cryptocurrency payments are irreversible by design. refunds, when issued, are accepted at the administrator’s discretion when technically possible.'}
            </span>
          </p>
        </div>
      </div>

      {[
        {
          t: ar ? 'قد يكون مؤهلاً للاسترداد' : 'May be refundable',
          items: ar
            ? ['دفعات ترسل بالخطأ مرتين لنفس الطلب.', 'الخطط التي لم تبدأ تجهيزها بعد (لم يتم إنشاء VPS).', 'أخطاء واضحة من فريقنا في التسعير أو التحقق.']
            : ['Duplicate payments for the same order.', 'Plans not yet provisioned (no VPS created).', 'Clear errors on our side in pricing or verification.'],
        },
        {
          t: ar ? 'غير قابلة للاسترداد' : 'Not refundable',
          items: ar
            ? ['الوقت المستهلك على VPS نشط.', 'المدرية الناجمة عن إرسال عبر شبكة خاطئة أو عنوان خاطئ.', 'خسائر التداول أو الفرص المفقودة نتيجة انقطاع.', 'الطلبات المرفوضة بسبب مخالفة شروط الخدمة.']
            : ['Consumed time on an active VPS.', 'Losses from sending on the wrong network or wrong address.', 'Trading losses or missed opportunities from downtime.', 'Orders rejected for Terms violations.'],
        },
      ].map((s) => (
        <div key={s.t} className="card p-6 mb-4">
          <h2 className="font-bold mb-3">{s.t}</h2>
          <ul className="text-sm text-muted space-y-2 list-disc ps-5">
            {s.items.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      ))}

      <p className="text-xs text-muted mt-6">
        {ar ? 'اطلب الاسترداد عبر تذكرة دعم من لوحة حسابك. نرد عادةً خلال يوم عمل، لكن التوقيت ليس مضموناً.' : 'Request refunds via a support ticket from your dashboard. We usually respond within a business day, but timings are not guaranteed.'}
      </p>
    </div>
  );
}
