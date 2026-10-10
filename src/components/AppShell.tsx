'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X, Globe } from 'lucide-react';
import { Logo } from '@/components/Logo';

const NAV = [
  { href: '/plans', en: 'VPS Plans', ar: 'خطط VPS' },
  { href: '/features', en: 'Features', ar: 'الميزات' },
  { href: '/how-it-works', en: 'How It Works', ar: 'كيف يعمل' },
  { href: '/faq', en: 'FAQ', ar: 'الأسئلة' },
  { href: '/contact', en: 'Contact', ar: 'اتصل بنا' },
];

export function AppShell({ locale, children }: { locale: 'en' | 'ar'; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith('/admin')) {
    // Admin has its own chrome.
    return <>{children}</>;
  }

  async function switchLocale() {
    const next = locale === 'en' ? 'ar' : 'en';
    document.cookie = `locale=${next}; path=/; max-age=31536000`;
    window.location.reload();
  }

  const t = (en: string, ar: string) => (locale === 'ar' ? ar : en);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 hairline backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg-0) 85%, transparent)' }}>
        <div className="container-app h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={30} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
                {t(n.en, n.ar)}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={switchLocale} className="btn btn-secondary !py-1.5 !px-3 text-xs" aria-label="Switch language">
              <Globe className="h-3.5 w-3.5" aria-hidden /> {locale === 'en' ? 'العربية' : 'English'}
            </button>
            <Link href="/login" className="btn btn-secondary !py-1.5 !px-3 text-xs">{t('Login', 'دخول')}</Link>
            <Link href="/plans" className="btn btn-primary !py-1.5 !px-3 text-xs">{t('Order Now', 'اطلب الآن')}</Link>
          </div>

          <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden hairline px-5 py-4 space-y-3" style={{ background: 'var(--bg-1)' }}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block text-[var(--text-2)]">
                {t(n.en, n.ar)}
              </Link>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={switchLocale} className="btn btn-secondary flex-1 text-xs">
                <Globe className="h-3.5 w-3.5" aria-hidden /> {locale === 'en' ? 'العربية' : 'English'}
              </button>
              <Link href="/login" onClick={() => setOpen(false)} className="btn btn-secondary flex-1 text-xs">{t('Login', 'دخول')}</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 hairline">
        <div className="container-app py-10 grid gap-8 md:grid-cols-4 text-sm">
          <div>
            <Logo size={30} />
            <p className="text-muted mt-3">{t('Trading-focused hosting. Simple plans. Competitive prices.', 'استضافة مخصصة للتداول. خطط بسيطة. أسعار تنافسية.')}</p>
          </div>
          <div>
            <div className="font-semibold mb-3">{t('Product', 'المنتج')}</div>
            <ul className="space-y-2 text-muted">
              <li><Link href="/plans" className="hover:text-[var(--text-1)]">{t('VPS Plans', 'خطط VPS')}</Link></li>
              <li><Link href="/vps/forex-vps" className="hover:text-[var(--text-1)]">Forex VPS</Link></li>
              <li><Link href="/vps/mt4-vps" className="hover:text-[var(--text-1)]">MetaTrader 4 VPS</Link></li>
              <li><Link href="/vps/mt5-vps" className="hover:text-[var(--text-1)]">MetaTrader 5 VPS</Link></li>
              <li><Link href="/vps/xauusd-scalping-vps" className="hover:text-[var(--text-1)]">XAUUSD Scalping VPS</Link></li>
              <li><Link href="/vps/ea-vps" className="hover:text-[var(--text-1)]">Expert Advisors VPS</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">{t('Company', 'الشركة')}</div>
            <ul className="space-y-2 text-muted">
              <li><Link href="/about" className="hover:text-[var(--text-1)]">{t('About Us', 'من نحن')}</Link></li>
              <li><Link href="/contact" className="hover:text-[var(--text-1)]">{t('Contact & Support', 'الدعم والتواصل')}</Link></li>
              <li><Link href="/faq" className="hover:text-[var(--text-1)]">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">{t('Legal', 'قانوني')}</div>
            <ul className="space-y-2 text-muted">
              <li><Link href="/terms" className="hover:text-[var(--text-1)]">{t('Terms of Service', 'شروط الخدمة')}</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--text-1)]">{t('Privacy Policy', 'سياسة الخصوصية')}</Link></li>
              <li><Link href="/refund-policy" className="hover:text-[var(--text-1)]">{t('Refund Policy', 'سياسة الاسترداد')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="container-app pb-8 text-xs text-muted">
          © {new Date().getFullYear()} TradeNode VPS. {t('All specifications are illustrative until infrastructure is provisioned and tested.', 'جميع المواصفات توضيحية حتى تجهيز البنية التحتية واختبارها.')}
        </div>
      </footer>
    </div>
  );
}
