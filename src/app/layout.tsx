import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import { pickLocale, isRtl } from '@/lib/i18n';
import { AppShell } from '@/components/AppShell';

export const metadata: Metadata = {
  title: { default: 'TradeNode VPS — Hosting Built for Traders', template: '%s | TradeNode VPS' },
  description: 'Affordable virtual servers built for MetaTrader, Expert Advisors, and automated trading workflows.',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>
        <AppShell locale={locale}>{children}</AppShell>
      </body>
    </html>
  );
}
