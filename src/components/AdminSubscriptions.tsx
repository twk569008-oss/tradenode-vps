'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

type Sub = {
  id: string; order_number: string; customer_name: string; customer_email: string;
  start_date: string; end_date: string; status: string; vps_id: string;
};

export function AdminSubscriptions() {
  const [rows, setRows] = useState<Sub[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/subscriptions');
    if (res.ok) setRows((await res.json()).subscriptions);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(s: Sub, action: string, extra: Record<string, unknown> = {}) {
    setBusy(s.id);
    await fetch('/api/admin/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId: s.id, action, ...extra }),
    });
    setBusy(null); await load();
  }

  if (rows == null) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Subscriptions</h1>
      {rows.length === 0 ? <p className="text-sm text-muted">No subscriptions yet.</p> : (
        <div className="space-y-3">
          {rows.map((s) => {
            const ended = new Date(s.end_date) < new Date();
            return (
              <div key={s.id} className="card p-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm">{s.order_number}</strong>
                    <span className={`badge text-xs ${s.status === 'active' ? 'badge-green' : s.status === 'expired' ? 'badge-red' : 'badge-amber'}`}>{s.status}</span>
                    {ended && <span className="badge badge-amber text-xs">past end date</span>}
                  </div>
                  <div className="text-xs text-muted mt-1">{s.customer_name} · {s.customer_email}</div>
                  <div className="text-xs text-muted">start {new Date(s.start_date).toLocaleDateString()} → end {new Date(s.end_date).toLocaleDateString()}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button disabled={busy === s.id} onClick={() => act(s, 'extend_days', { days: 30 })} className="btn btn-secondary text-xs">+30 days</button>
                  <button disabled={busy === s.id} onClick={() => act(s, 'extend_days', { days: 1 })} className="btn btn-secondary text-xs">+1 day</button>
                  {s.status === 'active' ? (
                    <>
                      <button disabled={busy === s.id} onClick={() => act(s, 'suspend')} className="btn btn-secondary text-xs">Suspend</button>
                      <button disabled={busy === s.id} onClick={() => act(s, 'expire_now')} className="btn btn-secondary text-xs" style={{ color: '#f87171' }}>Expire now</button>
                    </>
                  ) : (
                    <button disabled={busy === s.id} onClick={() => act(s, 'reactivate')} className="btn btn-secondary text-xs">Reactivate</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
