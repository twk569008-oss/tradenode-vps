'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

type Log = { id: string; action: string; entity_type: string; entity_id: string | null; details: string | null; created_at: string; actor_name: string | null; actor_email: string | null };

const ACTIONS = ['', 'payment_approved', 'payment_rejected', 'proof_viewed', 'credential_viewed', 'vps_delivered', 'order_created', 'ticket_created', 'password_changed', 'login_failed'];

export function AdminAudit() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState('');
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), size: '50' });
    if (action) qs.set('action', action);
    const res = await fetch(`/api/admin/audit?${qs.toString()}`);
    if (res.ok) { const d = await res.json(); setLogs(d.logs); setTotal(d.total); }
  }, [page, action]);
  useEffect(() => { load(); }, [load]);

  if (logs == null) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold">Audit Log</h1>
        <select className="input w-auto text-sm" value={action} onChange={(e) => { setPage(0); setAction(e.target.value); }}>
          {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All actions'}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead><tr className="hairline text-muted text-xs"><th className="p-3 text-start">When</th><th className="p-3 text-start">Actor</th><th className="p-3 text-start">Action</th><th className="p-3 text-start">Entity</th><th className="p-3 text-start">Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="hairline">
                <td className="p-3 text-xs text-muted">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-3 text-xs">{l.actor_name ?? '—'}{l.actor_email ? <div className="text-muted">{l.actor_email}</div> : null}</td>
                <td className="p-3"><span className="badge text-xs">{l.action}</span></td>
                <td className="p-3 text-xs text-muted">{l.entity_type}{l.entity_id ? ` · ${String(l.entity_id).slice(0, 14)}…` : ''}</td>
                <td className="p-3 text-xs text-muted max-w-xs truncate">{l.details ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{total} total events</span>
        <div className="flex gap-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="btn btn-secondary text-xs">Prev</button>
          <button disabled={(page + 1) * 50 >= total} onClick={() => setPage(page + 1)} className="btn btn-secondary text-xs">Next</button>
        </div>
      </div>
    </div>
  );
}
