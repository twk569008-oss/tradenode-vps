'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, ShoppingBag, Server, ReceiptText, LifeBuoy, Settings, Bell, LogOut, Menu, X, Wallet } from 'lucide-react';

const NAV = [
  { href: '/dashboard', en: 'Overview', ar: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/dashboard/wallet', en: 'My Wallet', ar: 'محفظتي', icon: Wallet },
  { href: '/dashboard/orders', en: 'My Orders', ar: 'طلباتي', icon: ShoppingBag },
  { href: '/dashboard/vps', en: 'My VPS Servers', ar: 'خوادمي', icon: Server },
  { href: '/dashboard/payments', en: 'Payment History', ar: 'سجل المدفوعات', icon: ReceiptText },
  { href: '/dashboard/tickets', en: 'Support Tickets', ar: 'التذاكر', icon: LifeBuoy },
  { href: '/dashboard/notifications', en: 'Notifications', ar: 'الإشعارات', icon: Bell },
  { href: '/dashboard/settings', en: 'Account Settings', ar: 'إعدادات الحساب', icon: Settings },
];

export function DashboardShell({ locale, children }: { locale: 'en' | 'ar'; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);

  useEffect(() => {
    fetch('/api/customer/overview').then((r) => r.json()).then((d) => {
      if (d.unreadNotifications != null) setUnread(d.unreadNotifications);
    }).catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <div className="container-app py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-bold">{t('Customer Dashboard', 'لوحة العميل')}</h1>
        <div className="flex gap-2">
          <Link href="/plans" className="btn btn-secondary text-xs">{t('New order', 'طلب جديد')}</Link>
          <button onClick={logout} className="btn btn-secondary text-xs"><LogOut className="h-3.5 w-3.5" aria-hidden />{t('Logout', 'خروج')}</button>
        </div>
      </div>

      <div className="grid md:grid-cols-[220px_1fr] gap-6">
        <aside className={open ? 'block' : 'hidden md:block'}>
          <nav className="card p-3 space-y-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                style={pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
                  ? { background: 'var(--accent-soft)', color: 'var(--accent-2)', fontWeight: 600 }
                  : { color: 'var(--text-2)' }}>
                <n.icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{t(n.en, n.ar)}</span>
                {n.href === '/dashboard/notifications' && unread > 0 && (
                  <span className="badge badge-red !px-2 !py-0 text-xs">{unread}</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <button className="md:hidden btn btn-secondary text-xs w-fit" onClick={() => setOpen(!open)}>
          {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          {t('Menu', 'القائمة')}
        </button>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
