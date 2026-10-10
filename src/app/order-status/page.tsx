'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';

const STAGES = ['Created', 'Payment submitted', 'Under review', 'Approved / Awaiting VPS', 'Provisioning', 'Active'];

function stageIdx(status: string): number {
  switch (status) {
    case 'pending_payment': return 0;
    case 'payment_submitted': case 'under_review': return 1;
    case 'payment_approved': case 'awaiting_vps': return 3;
    case 'vps_provisioning': return 4;
    case 'active': return 5;
    case 'payment_rejected': case 'cancelled': case 'expired': return -1;
    default: return 0;
  }
}

export default function OrderStatusPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string; plan: string; price: number; created_at: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setResult(null);
    try {
      const res = await fetch(`/api/order-status?order=${encodeURIComponent(orderNumber.trim())}&email=${encodeURIComponent(email.trim())}`);
      const d = await res.json().catch(() => ({}) as { error?: string });
      if (res.ok && d.order) setResult(d.order);
      else setErr(d.error === 'not_found_or_mismatch' ? 'No matching order for that number + email combination.' : 'Lookup failed. Check details.');
    } catch { setErr('Network error.'); }
    finally { setBusy(false); }
  }

  const idx = result ? stageIdx(String(result.status)) : -1;
  const inactive = ['payment_rejected', 'cancelled', 'expired'].includes(String(result?.status));

  return (
    <div className="container-app py-14 max-w-2xl">
      <h1 className="text-3xl font-extrabold mb-4">Order Status</h1>
      <p className="text-muted text-sm mb-8">Look up an order without logging in. You need both the order number and the email used at purchase.</p>

      <form onSubmit={submit} className="card p-6 space-y-4 mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="onum">Order number</label>
            <input id="onum" className="input font-mono" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} required placeholder="TN-XXXXXX-XXXXXX" />
          </div>
          <div>
            <label className="label" htmlFor="oemail">Email</label>
            <input id="oemail" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
        </div>
        <button disabled={busy} className="btn btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
          Track order
        </button>
      </form>

      {err && <p className="text-xs badge badge-red mb-4">{err}</p>}

      {result && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="font-mono text-xs text-muted">{orderNumber}</div>
              <div className="font-bold mt-1">{String(result.plan)}</div>
            </div>
            <div className="text-end">
              <div className="text-xl font-extrabold">${Number(result.price).toFixed(2)}</div>
              <div className="text-xs text-muted">{new Date(result.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          {inactive ? (
            <p className="text-sm badge badge-red">{String(result.status).replace(/_/g, ' ')}</p>
          ) : (
            <ol className="space-y-2">
              {STAGES.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={i <= idx ? { background: 'var(--accent)', color: '#fff' } : { background: 'var(--bg-2)', color: 'var(--text-3)' }}>
                    {i + 1}
                  </span>
                  <span className={i <= idx ? 'font-semibold' : 'text-muted'}>{s}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
