import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/session';
import { getSetting } from '@/lib/settings';
import { MessageSquarePlus, LifeBuoy, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact & Support',
  description: 'Get help from the TradeNode VPS team — support tickets, FAQ, and contact channels.',
};

export default async function ContactPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';
  const user = await getCurrentUser();
  const supportEmail = getSetting('site.support_email');

  const channels = [
    {
      icon: MessageSquarePlus,
      title: ar ? 'تذكرة دعم' : 'Support ticket',
      desc: ar ? 'أسرع طريقة للحصول على مساعدة تقنية أو فواتير.' : 'Fastest route for technical or billing help.',
      href: user ? '/dashboard/tickets' : '/login?next=/dashboard/tickets',
      label: user ? (ar ? 'افتح تذكرة' : 'Open a ticket') : (ar ? 'سجل الدخول أولاً' : 'Log in first'),
    },
    {
      icon: BookOpen,
      title: ar ? 'الأسئلة الشائعة' : 'FAQ',
      desc: ar ? 'إجابات جاهزة عن الدفع والتحقق والاسترداد.' : 'Ready answers about payments, verification, and refunds.',
      href: '/faq',
      label: ar ? 'اقرأ الأسئلة' : 'Read FAQ',
    },
    {
      icon: LifeBuoy,
      title: ar ? 'البريد' : 'Email',
      desc: ar ? `راسلنا على ${supportEmail}` : `Email us at ${supportEmail}`,
      href: user ? '/dashboard/tickets' : '/register',
      label: ar ? 'ابدأ' : 'Get started',
    },
  ];

  return (
    <div className="container-app py-14 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-4">{ar ? 'التواصل والدعم' : 'Contact & Support'}</h1>
      <p className="text-muted text-sm mb-10">
        {ar ? 'فريقنا يساعدك عبر التذاكر. نرد عادةً خلال يوم عمل، لكن التوقيت ليس مضموناً.' : 'Our team helps you via tickets. We usually respond within a business day, but timings are not guaranteed.'}
      </p>
      <div className="grid gap-4">
        {channels.map((c) => (
          <Link key={c.title} href={c.href} className="card card-hover p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
              <c.icon className="h-5 w-5 text-[var(--accent-2)]" aria-hidden />
            </div>
            <div className="flex-1">
              <h2 className="font-bold mb-1">{c.title}</h2>
              <p className="text-sm text-muted">{c.desc}</p>
            </div>
            <span className="badge badge-accent text-xs">{c.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
