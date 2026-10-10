'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';

const STATUSES = ['', 'pending_payment', 'payment_submitted', 'under_review', 'payment_approved', 'awaiting_vps', 'vps_provisioning', 'active', 'payment_rejected', 'cancelled', 'expired'];
const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pending payment', payment_submitted: 'Proof submitted', under_review: 'Under review', payment_approved: 'Payment approved',
  awaiting_vps: 'Awaiting VPS setup', vps_provisioning: 'VPS provisioning', active: 'Active', payment_rejected: 'Rejected', cancelled: 'Cancelled', expired: 'Expired', '': 'All',
};

type Row = {
  id: string; order_number: string; status: string; price: number; billing_period: string; created_at: string;
  customer_name: string; customer_email: string; plan_name: string;
};

export function AdminOrdersList() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (q) qs.set('q', q);
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    const res = await fetch(`/api/admin/orders?${qs.toString()}`);
    if (res.ok) setRows((await res.json()).orders);
    setBusy(false);
  }, [status, q, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Orders</h1>
      <div className="card p-4 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Search</label>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" aria-hidden />
            <input className="input ps-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order # / email / name" />
          </div>
        </div>
        <div><label className="label">From</label><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex items-end"><button onClick={load} className="btn btn-secondary w-full justify-center">Apply</button></div>
      </div>

      {rows == null ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">No orders match the filters.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="hairline text-muted text-xs">
                <th className="p-3 text-start">Order #</th><th className="p-3 text-start">Customer</th><th className="p-3 text-start">Plan</th>
                <th className="p-3 text-start">Period</th><th className="p-3 text-start">USD</th><th className="p-3 text-start">Status</th><th className="p-3 text-start">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hairline hover:opacity-90">
                  <td className="p-3"><Link href={`/admin/orders/${r.id}`} className="font-mono text-[var(--accent-2)] hover:underline">{r.order_number}</Link></td>
                  <td className="p-3">{r.customer_name}<div className="text-xs text-muted">{r.customer_email}</div></td>
                  <td className="p-3">{r.plan_name}</td>
                  <td className="p-3">{r.billing_period}</td>
                  <td className="p-3 font-semibold">${r.price.toFixed(2)}</td>
                  <td className="p-3"><span className="badge text-xs">{STATUS_LABEL[r.status] ?? r.status}</span></td>
                  <td className="p-3 text-xs text-muted">{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {busy && <div className="text-xs text-muted">Refreshing…</div>}
    </div>
  );
}
