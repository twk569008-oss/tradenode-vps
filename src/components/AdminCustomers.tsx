'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

type Customer = {
  id: string; name: string; email: string; locale: string; role: string; is_active: number;
  suspended_at: string | null; created_at: string; last_login_at: string | null; orders_count: number;
};

export function AdminCustomers() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Customer[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const res = await fetch(`/api/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    if (res.ok) setRows((await res.json()).customers);
    setBusy(false);
  }, [q]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function act(c: Customer, action: 'suspend' | 'reactivate') {
    const reason = action === 'suspend' ? prompt('Reason for suspension?') : undefined;
    if (action === 'suspend' && !reason) return;
    setBusy(true);
    await fetch('/api/admin/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: c.id, action, reason: reason ?? undefined }),
    });
    setBusy(false); await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Customers</h1>
      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
          <input className="input ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" />
        </div>
        <button onClick={load} className="btn btn-secondary text-sm">Search</button>
      </div>

      {rows == null ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead><tr className="hairline text-muted text-xs"><th className="p-3 text-start">Name</th><th className="p-3 text-start">Email</th><th className="p-3 text-start">Orders</th><th className="p-3 text-start">Joined</th><th className="p-3 text-start">Status</th><th className="p-3"></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hairline">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3">{c.email}<div className="text-xs text-muted">{c.role}</div></td>
                  <td className="p-3">{c.orders_count}</td>
                  <td className="p-3 text-xs text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-3">{c.is_active ? <span className="badge badge-green text-xs">active</span> : <span className="badge badge-red text-xs">suspended</span>}</td>
                  <td className="p-3">
                    {c.role !== 'admin' && (
                      c.is_active
                        ? <button disabled={busy} onClick={() => act(c, 'suspend')} className="btn btn-secondary text-xs" style={{ color: '#f87171' }}>Suspend</button>
                        : <button disabled={busy} onClick={() => act(c, 'reactivate')} className="btn btn-secondary text-xs">Reactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
