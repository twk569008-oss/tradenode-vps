'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, X } from 'lucide-react';

const CATS = [
  { key: 'technical', en: 'Technical issue', ar: 'مشكلة تقنية' },
  { key: 'connection', en: 'Connection issue', ar: 'مشكلة اتصال' },
  { key: 'payment', en: 'Payment question', ar: 'سؤال عن الدفع' },
  { key: 'renewal', en: 'Renewal request', ar: 'طلب تجديد' },
  { key: 'other', en: 'Other inquiry', ar: 'استفسار آخر' },
];

export function NewTicketButton({ locale }: { locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('technical');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, message }),
      });
      if (res.ok) { setOpen(false); router.refresh(); return; }
      const d = await res.json().catch(() => ({ error: 'x' }));
      setErr(d.error === 'rate_limited' ? t('Too many tickets — try later.', 'تذاكر كثيرة — حاول لاحقاً.') : t('Something went wrong.', 'حدث خطأ.'));
    } catch { setErr(t('Network error.', 'خطأ في الشبكة.')); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-primary text-xs"><Plus className="h-3.5 w-3.5" aria-hidden />{t('New ticket', 'تذكرة جديدة')}</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="card p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{t('Open a support ticket', 'افتح تذكرة دعم')}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label={t('Close', 'إغلاق')}><X className="h-4 w-4" aria-hidden /></button>
            </div>
            <div>
              <label className="label">{t('Subject', 'الموضوع')}</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required minLength={5} maxLength={160} />
            </div>
            <div>
              <label className="label">{t('Category', 'التصنيف')}</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATS.map((c) => <option key={c.key} value={c.key}>{t(c.en, c.ar)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('Message', 'الرسالة')}</label>
              <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={4000} rows={5} />
            </div>
            {err && <p className="text-xs badge badge-red">{err}</p>}
            <button disabled={busy} className="btn btn-primary w-full justify-center">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t('Create ticket', 'إنشاء التذكرة')}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
