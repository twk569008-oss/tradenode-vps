'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardList, ReceiptText, Wallet, Boxes, Users, CalendarClock, LifeBuoy, Settings, Scale, ShieldCheck, LogOut, Menu, X } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/payments', label: 'Payment Queue', icon: ReceiptText },
  { href: '/admin/wallet-deposits', label: 'Wallet Deposits', icon: Wallet },
  { href: '/admin/plans', label: 'Plans', icon: Boxes },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: CalendarClock },
  { href: '/admin/tickets', label: 'Tickets', icon: LifeBuoy },
  { href: '/admin/settings', label: 'Settings & Payments', icon: Settings },
  { href: '/admin/comparison', label: 'Pricing Comparison', icon: Scale },
  { href: '/admin/audit', label: 'Audit Log', icon: ShieldCheck },
];

export function AdminShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const [depositPending, setDepositPending] = useState(0);

  useEffect(() => {
    fetch('/api/admin/overview').then((r) => r.json()).then((d) => setPending(d.stats?.pendingReview ?? 0)).catch(() => {});
    fetch('/api/admin/wallet-deposits').then((r) => r.json()).then((d) => {
      const pend = (d.deposits ?? []).filter((x: { status: string }) => x.status === 'pending').length;
      setDepositPending(pend);
    }).catch(() => {});
  }, [pathname]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <div className="min-h-screen flex">
      <aside className={open ? 'block fixed inset-0 z-50 overflow-auto' : 'hidden md:flex md:sticky md:top-0 md:h-screen'}>
        <div className="w-60 shrink-0 hairline h-full overflow-load auto" style={{ background: 'var(--bg-1)' }}>
          <div className="p-4 flex items-center justify-between">
            <Link href="/admin" className="brand">TradeNode <span className="text-[var(--accent-2)]">Admin</span></Link>
            <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" aria-hidden /></button>
          </div>
          <nav className="px-3 py-3 space-y-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                style={pathname === n.href || (n.href !== '/admin' && pathname.startsWith(n.href)) ? { background: 'var(--accent-soft)', color: 'var(--accent-2)', fontWeight: 600 } : { color: 'var(--text-2)' }}>
                <n.icon className="h-4 w-4" aria-hidden />
                <span className="flex-1">{n.label}</span>
                {n.href === '/admin/payments' && pending > 0 && <span className="badge badge-red !px-2 !py-0 text-xs">{pending}</span>}
                {n.href === '/admin/wallet-deposits' && depositPending > 0 && <span className="badge badge-red !px-2 !py-0 text-xs">{depositPending}</span>}
              </Link>
            ))}
          </nav>
          <div className="px-3 py-4 mt-auto" style={{ position: 'absolute', bottom: 0, width: '15rem' }}>
            <div className="text-xs text-muted mb-2 truncate">{user.name}<br />{user.email}</div>
            <button onClick={logout} className="btn btn-secondary text-xs w-full justify-center"><LogOut className="h-3.5 w-3.5" aria-hidden />Logout</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <button className="md:hidden m-4 btn btn-secondary text-xs" onClick={() => setOpen(true)}>
          <Menu className="h-4 w-4" aria-hidden /> Menu
        </button>
        <div className="p-6 md:p-8 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
