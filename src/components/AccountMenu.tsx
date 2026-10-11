'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LayoutDashboard, Settings, LogOut, User } from 'lucide-react';

type Me = {
  name: string;
  email: string;
  role: 'customer' | 'admin';
};

export function AccountMenu({ locale, authed }: { locale: 'en' | 'ar'; authed: boolean }) {
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d && d.user) setMe({ name: d.user.name, email: d.user.email, role: d.user.role });
      else if (d && d.name) setMe({ name: d.name, email: d.email, role: d.role });
    }).catch(() => {});
  }, [authed]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  if (!authed || !me) return null;

  const base = me.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn btn-secondary !py-1.5 !px-3 text-xs max-w-[180px]" aria-haspopup="menu" aria-expanded={open}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)' }}>
          <User className="h-3 w-3 text-[var(--accent-2)]" aria-hidden />
        </span>
        <span className="truncate hidden sm:inline">{me.name}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-52 card p-2 z-50" style={{ background: 'var(--bg-1)' }} role="menu">
          <div className="px-3 py-2 rounded-lg mb-1" style={{ background: 'var(--bg-2)' }}>
            <p className="font-semibold text-sm truncate">{me.name}</p>
            <p className="text-xs text-muted truncate">{me.email}</p>
          </div>
          <Link href={base} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg-2)]" role="menuitem">
            <LayoutDashboard className="h-4 w-4" aria-hidden /> {me.role === 'admin' ? t('Admin panel', 'لوحة الإدارة') : t('My dashboard', 'لوحتي')}
          </Link>
          <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg-2)]" role="menuitem">
            <Settings className="h-4 w-4" aria-hidden /> {t('Account settings', 'إعدادات الحساب')}
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-[var(--bg-2)] text-start" style={{ color: '#f87171' }} role="menuitem">
            <LogOut className="h-4 w-4" aria-hidden /> {t('Logout', 'تسجيل الخروج')}
          </button>
        </div>
      )}
    </div>
  );
}
