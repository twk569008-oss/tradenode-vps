'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Eye, CheckCircle2, XCircle } from 'lucide-react';

type Sub = {
  id: string; order_id: string; order_number: string; network_code: string; transaction_hash: string | null;
  status: string; submitted_at: string; amount_usd: number | null; customer_name: string; customer_email: string;
  plan_name: string; screenshot_storage_key: string | null;
};

export function AdminPaymentsQueue() {
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [filter, setFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = filter === 'all' ? '' : `?status=${filter}`;
    const res = await fetch(`/api/admin/submissions${qs}`);
    if (res.ok) setSubs((await res.json()).submissions);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function act(sub: Sub, action: 'approve_payment' | 'reject_payment') {
    setBusy(sub.id);
    try {
      await fetch(`/api/admin/orders/${sub.order_id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, submissionId: sub.id, reason: action === 'reject_payment' ? 'Rejected from payment queue' : 'Approved from payment queue' }),
      });
      await load();
    } catch { /* refetch on fail */ }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Payment review queue</h1>
      <div className="flex gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="btn btn-secondary text-xs"
            style={filter === f ? { borderColor: 'var(--accent)', color: 'var(--accent-2)' } : undefined}>{f}</button>
        ))}
      </div>

      {subs == null ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>
      ) : subs.length === 0 ? (
        <p className="text-sm text-muted">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/admin/orders/${s.order_id}`} className="font-mono text-xs text-[var(--accent-2)] hover:underline">{s.order_number}</Link>
                    <span className={`badge text-xs ${s.status === 'approved' ? 'badge-green' : s.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>{s.status}</span>
                  </div>
                  <div className="text-sm font-semibold mt-2">{s.plan_name} · ${Number(s.amount_usd ?? 0).toFixed(2)}</div>
                  <div className="text-xs text-muted">{s.customer_name} · {s.customer_email}</div>
                  <div className="text-xs font-mono text-muted mt-1 break-all" dir="ltr">{s.network_code} · {s.transaction_hash ?? 'no hash'}</div>
                  <div className="text-xs text-muted mt-1">{new Date(s.submitted_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {s.screenshot_storage_key && (
                    <a href={`/api/admin/proof?submissionId=${s.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs"><Eye className="h-3 w-3" aria-hidden />Screenshot</a>
                  )}
                  {s.status === 'pending' && (
                    <div className="flex gap-2">
                      <button disabled={busy === s.id} onClick={() => act(s, 'approve_payment')} className="btn btn-primary text-xs"><CheckCircle2 className="h-3 w-3" aria-hidden />Approve</button>
                      <button disabled={busy === s.id} onClick={() => act(s, 'reject_payment')} className="btn btn-secondary text-xs" style={{ color: '#f87171' }}><XCircle className="h-3 w-3" aria-hidden />Reject</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
