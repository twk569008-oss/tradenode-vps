'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Upload, CheckCircle2 } from 'lucide-react';

const NETWORKS = [
  { code: 'TRC20-USDT', label: 'Tether USDT · TRON (TRC20)' },
  { code: 'ERC20-USDT', label: 'Tether USDT · Ethereum (ERC20)' },
  { code: 'SOL', label: 'Solana · SOL' },
  { code: 'BNB', label: 'BNB Smart Chain (BEP20)' },
  { code: 'BTC', label: 'Bitcoin · BTC' },
];

export default function ProofPage() {
  const params = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const orderNumber = params.orderNumber;

  const [network, setNetwork] = useState(NETWORKS[0].code);
  const [txHash, setTxHash] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.set('network', network);
      fd.set('txHash', txHash);
      if (file) fd.set('screenshot', file);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/proof`, { method: 'POST', body: fd });
      if (res.ok) { setDone(true); setTimeout(() => router.push('/dashboard/orders'), 2500); return; }
      const d = await res.json().catch(() => ({}) as { error?: string });
      setErr(String(d.error ?? 'submission_failed'));
    } catch { setErr('network_error'); }
    finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="container-app py-20 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" aria-hidden />
        <h1 className="text-xl font-bold mb-2">Payment proof submitted</h1>
        <p className="text-sm text-muted max-w-md mx-auto">
          Your order is now <strong>Payment Under Review</strong>. A human will check the transaction and update your order status in the dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="container-app py-12 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Submit payment proof</h1>
      <p className="text-sm text-muted mb-6">Order <span className="font-mono font-semibold">{orderNumber}</span></p>

      <form onSubmit={submit} className="card p-6 space-y-5">
        <div>
          <label className="label">Cryptocurrency & network used</label>
          <select className="input" value={network} onChange={(e) => setNetwork(e.target.value)}>
            {NETWORKS.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Transaction hash (optional but recommended)</label>
          <input className="input font-mono text-xs" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x… or tx id" dir="ltr" maxLength={120} />
          <p className="text-xs text-muted mt-1">Optional — significantly speeds up verification.</p>
        </div>

        <div>
          <label className="label">Payment screenshot (PNG / JPG / WEBP / PDF)</label>
          <label className="flex items-center gap-3 rounded-lg border border-dashed p-4 cursor-pointer" style={{ borderColor: 'var(--stroke-2)' }}>
            <Upload className="h-4 w-4 text-muted" aria-hidden />
            <span className="text-sm text-muted">{file ? file.name : 'Choose a file…'}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <p className="text-xs text-muted mt-1">Max 5 MB. Stored privately; only you and the review team can open it.</p>
        </div>

        {err && <p className="text-xs badge badge-red">{String(err)}</p>}

        <button disabled={busy} className="btn btn-primary w-full justify-center">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Submit for review
        </button>
        <p className="text-xs text-muted text-center">
          Uploading a screenshot does not automatically mark the order as paid. A human verifies every transaction.
        </p>
      </form>
    </div>
  );
}
