'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Wallet, RotateCw } from 'lucide-react';

type Dep = {
  id: string; user_name: string; user_email: string; amount: string; status: string;
  note: string | null; created_at: string;
};

export function AdminWalletDeposits({ locale }: { locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const [deposits, setDeposits] = useState<Dep[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/wallet-deposits').then((r) => r.json()).then((d) => setDeposits(d.deposits ?? [])).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(id); setMsg(null);
    try {
      const res = await fetch('/api/admin/wallet-deposits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ depositId: id, action, reason: reason[id] || undefined }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: action === 'approve' ? t('Deposit approved — balance credited.', 'تم قبول الشحن وتمت إضافة الرصيد.') : t('Deposit rejected — customer notified.', 'تم رفض الشحن وأُبلغ العميل.') });
        load();
      } else {
        const er = await res.json().catch(() => ({ error: 'error' }));
        setMsg({ ok: false, text: `${t('Failed:', 'فشل:')} ${er.error ?? '?'}` });
      }
    } finally { setBusy(null); }
  }

  const pending = deposits?.filter((d) => d.status === 'pending') ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-[var(--accent-2)]" aria-hidden /> {t('Wallet deposits', 'طلبات شحن المحفظة')}</h1>
          <p className="text-xs text-muted mt-1">{t('Review crypto top-ups, then approve to credit customer balances.', 'راجع عمليات الشحن ثم اقبلها لإضافة رصيد الزبون.')}</p>
        </div>
        <button onClick={load} className="btn btn-secondary text-xs"><RotateCw className="h-3.5 w-3.5" aria-hidden />{t('Refresh', 'تحديث')}</button>
      </div>

      {msg && <p className={`text-xs badge ${msg.ok ? 'badge-green' : 'badge-red'}`}>{msg.text}</p>}

      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-bold">{t('Pending', 'قيد الانتظار')}</h2>
          {pending.length > 0 && <span className="badge badge-amber !py-0 text-xs">{pending.length}</span>}
        </div>
        {!deposits ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[var(--accent-2)]" aria-hidden /></div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted">{t('No pending deposit requests.', 'لا طلبات شحن معلقة.')}</p>
        ) : (
          <div className="space-y-3">
            {pending.map((d) => (
              <div key={d.id} className="rounded-lg p-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--stroke-2)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-sm">{d.user_name} <span className="text-muted font-normal text-xs">({d.user_email})</span></p>
                    <p className="text-xs text-muted" dir="ltr">{new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-xl font-extrabold text-green-400">${Number(d.amount).toFixed(2)}</span>
                </div>
                {d.note && <p className="text-xs font-mono text-muted break-all mb-2" dir="ltr">{d.note}</p>}
                <input className="input text-xs mb-2" placeholder={t('Rejection reason (optional)', 'سبب الرفض (اختياري)')} value={reason[d.id] ?? ''} onChange={(e) => setReason({ ...reason, [d.id]: e.target.value })} maxLength={500} />
                <div className="flex gap-2">
                  <button disabled={busy === d.id} onClick={() => act(d.id, 'approve')} className="btn btn-primary text-xs"><CheckCircle2 className="h-3 w-3" aria-hidden />{t('Approve & credit', 'قبول وإضافة الرصيد')}</button>
                  <button disabled={busy === d.id} onClick={() => act(d.id, 'reject')} className="btn btn-secondary text-xs" style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.4)' }}><XCircle className="h-3 w-3" aria-hidden />{t('Reject', 'رفض')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-bold mb-3">{t('Recent history', 'السجل الأخير')}</h2>
        {deposits && deposits.filter((d) => d.status !== 'pending').slice(0, 30).map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm mb-1" style={{ background: 'var(--bg-2)' }}>
            <div className="min-w-0">
              <p className="text-sm truncate">{d.user_name} <span className="text-muted text-xs">{d.user_email}</span></p>
              <p className="text-xs text-muted" dir="ltr">{new Date(d.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={d.status === 'approved' ? 'badge badge-green text-xs' : 'badge badge-red text-xs'}>{d.status}</span>
              <span className="font-bold">${Number(d.amount).toFixed(2)}</span>
            </div>
          </div>
        ))}
        {deposits && deposits.filter((d) => d.status !== 'pending').length === 0 && <p className="text-sm text-muted">{t('Nothing yet.', 'لا شيء بعد.')}</p>}
      </div>
    </div>
  );
}
