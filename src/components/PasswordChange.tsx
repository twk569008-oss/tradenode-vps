'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function PasswordChange({ locale }: { locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/customer/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, next }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: t('Password changed. Please log in again.', 'تم تغيير كلمة المرور. يرجى تسجيل الدخول مجدداً.') });
        setTimeout(() => (window.location.href = '/login'), 1800);
        return;
      }
      const d = await res.json().catch(() => ({ error: 'error' }));
      const map: Record<string, string> = {
        weak_password: t('Too weak: 10+ chars, mixed case, number, symbol.', 'ضعيفة جداً: 10+ أحرف مع أحرف كبيرة وصغيرة ورقم ورمز.'),
        wrong_current_password: t('Current password is incorrect.', 'كلمة المرور الحالية غير صحيحة.'),
        rate_limited: t('Too many attempts — try later.', 'محاولات كثيرة — حاول لاحقاً.'),
      };
      setMsg({ ok: false, text: map[d.error as string] ?? t('Something went wrong.', 'حدث خطأ.') });
    } catch { setMsg({ ok: false, text: t('Network error.', 'خطأ في الشبكة.') }); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="font-bold text-lg mb-4">{t('Change password', 'تغيير كلمة المرور')}</h2>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="label">{t('Current password', 'كلمة المرور الحالية')}</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required minLength={1} />
        </div>
        <div>
          <label className="label">{t('New password', 'كلمة المرور الجديدة')}</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required minLength={10} />
          <p className="text-xs text-muted mt-1">{t('10+ characters, with upper & lower case, a number, and a symbol.', '10+ أحرف مع أحرف كبيرة وصغيرة ورقم ورمز.')}</p>
        </div>
        {msg && <p className={`text-xs ${msg.ok ? 'badge badge-green' : 'badge badge-red'}`}>{msg.text}</p>}
        <button disabled={busy} className="btn btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('Update password', 'تحديث كلمة المرور')}
        </button>
      </div>
    </form>
  );
}
