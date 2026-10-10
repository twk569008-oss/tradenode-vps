import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { CtaBand } from '@/components/CtaBand';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Who runs TradeNode VPS and why we built it for traders who need terminals online around the clock.',
};

export default async function AboutPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';

  return (
    <div className="container-app py-14 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6">{ar ? 'من نحن' : 'About Us'}</h1>
      <div className="space-y-5 text-sm text-[var(--text-2)] leading-relaxed">
        <p>
          {ar
            ? 'TradeNode VPS هو مزود استضافة مخصص للمتداولين الذين يحتاجون منصاتهم تعمل باستمرار — MetaTrader، الخبرات الآلية، وروبوتات التداول — دون الاعتماد على جهاز شخصي يعمل Romans.'
            : 'TradeNode VPS is a hosting provider focused on traders who need their platforms running continuously — MetaTrader, Expert Advisors, and trading bots — without depending on a personal computer staying on.'}
        </p>
        <p>
          {ar
            ? 'بدأنا لأن معظم مزودي VPS العامين لا يفهمون احتياجات المتداولين: عدد الأطراف، سلوك EA، أو الفروق الدقيقة في الدفع المشفر. نبني كل شيء ع數 للمتداولين.'
            : 'We started because most general-purpose VPS providers do not understand trader needs: terminal counts, EA behavior, or cryptocurrency payment flows. We build everything trader-first.'}
        </p>
        <p>
          {ar
            ? 'نحن صادقون بشأن ما نفعله اليوم: التجهيز يتم يدوياً بشرياً، والتحقق من الدفع يدوي بشري. لا نتظاهر بأن الأتمتة موجودة عندما لا تكون.'
            : 'We are honest about what we do today: provisioning is manual by a human, and payment verification is human-reviewed. We do not fake automation we do not have.'}
        </p>
        <div className="card p-6 mt-8">
          <h2 className="font-bold mb-3 text-[var(--accent-2)]">{ar ? 'ما نحن كذلك' : 'What we are'}</h2>
          <ul className="text-sm space-y-2 list-disc ps-5 text-muted">
            <li>{ar ? 'مزود استضافة VPS مخصص للتداول.' : 'A trading-focused VPS hosting provider.'}</li>
            <li>{ar ? 'داعمون للدفع المشفر with بشرى التحقق.' : 'Cryptocurrency-friendly with human payment verification.'}</li>
            <li>{ar ? 'شفافون حول المواصفات والأسعار.' : 'Transparent about specifications and pricing.'}</li>
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="font-bold mb-3 text-[var(--accent-2)]">{ar ? 'ما نحن لسنا كذلك' : 'What we are not'}</h2>
          <ul className="text-sm space-y-2 list-disc ps-5 text-muted">
            <li>{ar ? 'لسنا شركة وسيط أو مستشار مالي.' : 'Not a broker or financial adviser.'}</li>
            <li>{ar ? 'لا نضمن نتائج التداول أو الربح.' : 'We do not guarantee trading results or profits.'}</li>
            <li>{ar ? 'لا نصنع شهادات مزيفة أو أرقام عملاء وهمية.' : 'We do not fabricate testimonials or fake customer counts.'}</li>
          </ul>
        </div>
      </div>
      <CtaBand title={ar ? 'جاهز للانضمام؟' : 'Ready to join?'} subtitle={ar ? 'خطط من $2 شهرياً.' : 'Plans from $2/month.'} cta={ar ? 'استكشف الخطط' : undefined} />
    </div>
  );
}
