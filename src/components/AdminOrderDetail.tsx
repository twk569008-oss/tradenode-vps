'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Send, ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';

type Sub = { id: string; network_code: string; transaction_hash: string | null; screenshot_storage_key: string | null; status: string; submitted_at: string; amount_usd: number | null; reviewer_note: string | null };
type Instance = { hostname: string | null; ip: string | null; rdp_port: number | null; username: string | null; password: string | null; password_hint: string | null; os: string | null; specs: string | null; provisioning_date: string | null; start_date: string | null; expiration_date: string | null; setup_instructions: string | null; private_note: string | null; status: string; sent_to_customer: number } | null;
type Order = { id: string; order_number: string; status: string; billing_period: string; price: number; created_at: string; customer_name: string; customer_email: string; plan_name: string; cpu: string; ram: string; storage: string; admin_notes: string | null };
type Data = { order: Order; submissions: Sub[]; instance: Instance; subscription: { id: string; end_date: string; status: string } | null };

export function AdminOrderDetail() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Delivery form state
  const [d, setD] = useState({ hostname: '', ip: '', rdpPort: '', username: '', password: '', os: '', specs: '', setupInstructions: '', privateNote: '' });

  useEffect(() => {
    fetch(`/api/admin/orders/${orderId}`).then((r) => r.json()).then((x: Data) => {
      setData(x);
      if (x.instance) {
        setD({
          hostname: x.instance.hostname ?? '', ip: x.instance.ip ?? '', rdpPort: x.instance.rdp_port ? String(x.instance.rdp_port) : '',
          username: x.instance.username ?? '', password: x.instance.password ?? '', os: x.instance.os ?? '',
          specs: x.instance.specs ?? '', setupInstructions: x.instance.setup_instructions ?? '', privateNote: x.instance.private_note ?? '',
        });
      }
    }).catch(() => {});
  }, [orderId]);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: `Action applied: ${action}` });
        const fresh = await fetch(`/api/admin/orders/${orderId}`).then((r) => r.json());
        setData(fresh);
      } else {
        const er = await res.json().catch(() => ({ error: 'error' }));
        setMsg({ ok: false, text: `Failed: ${er.error ?? 'unknown'}` });
      }
    } catch { setMsg({ ok: false, text: 'Network error.' }); }
    finally { setBusy(false); }
  }

  async function saveDelivery(send: boolean) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/delivery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostname: d.hostname || null, ip: d.ip || null, rdpPort: d.rdpPort ? Number(d.rdpPort) : null,
          username: d.username || null, password: d.password || null, os: d.os || null, specs: d.specs || null,
          setupInstructions: d.setupInstructions || null, privateNote: d.privateNote || null,
          sendToCustomer: send,
        }),
      });
      if (res.ok) setMsg({ ok: true, text: send ? 'VPS details sent to customer.' : 'Delivery details saved (not sent yet).' });
      else {
        const er = await res.json().catch(() => ({ error: 'x' }));
        setMsg({ ok: false, text: `Failed: ${er.error ?? 'unknown'}` });
      }
    } catch { setMsg({ ok: false, text: 'Network error.' }); }
    finally { setBusy(false); }
  }

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  const o = data.order;
  const pendingSub = data.submissions.find((s) => s.status === 'pending');

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="text-xs text-[var(--accent-2)] hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" aria-hidden />Back to orders</Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="font-mono text-xs text-muted">{o.order_number}</div>
            <h1 className="text-xl font-bold">{o.plan_name} · ${o.price.toFixed(2)} / {o.billing_period}</h1>
            <p className="text-xs text-muted mt-1">{o.customer_name} · {o.customer_email} · created {new Date(o.created_at).toLocaleString()}</p>
          </div>
          <span className="badge badge-accent">{o.status.replace(/_/g, ' ')}</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">CPU</span> <strong className="float-end">{o.cpu}</strong></div>
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">RAM</span> <strong className="float-end">{o.ram}</strong></div>
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">Storage</span> <strong className="float-end">{o.storage}</strong></div>
        </div>
      </div>

      {/* Payment review */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">Payment review</h2>
        {data.submissions.length === 0 ? <p className="text-sm text-muted">No submissions yet.</p> : (
          <div className="space-y-3 mb-4">
            {data.submissions.map((s) => (
              <div key={s.id} className="rounded-lg p-4" style={{ background: 'var(--bg-2)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm">{s.network_code}</span>
                  <span className={`badge text-xs ${s.status === 'approved' ? 'badge-green' : s.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>{s.status}</span>
                </div>
                <div className="text-xs font-mono text-muted break-all" dir="ltr">{s.transaction_hash ?? 'no hash provided'}</div>
                <div className="text-xs text-muted mt-1">{new Date(s.submitted_at).toLocaleString()} · ${Number(s.amount_usd ?? 0).toFixed(2)}</div>
                {s.reviewer_note && <div className="text-xs mt-1">note: {s.reviewer_note}</div>}
                {s.screenshot_storage_key && (
                  <a href={`/api/admin/proof?submissionId=${s.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary text-xs mt-2 inline-flex">
                    <Eye className="h-3 w-3" aria-hidden /> View screenshot
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <label className="label">Reason / note (recorded in audit trail)</label>
        <input className="input mb-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. hash verified on explorer / amount mismatch" maxLength={500} />

        <div className="flex flex-wrap gap-2">
          <button disabled={busy || !pendingSub} onClick={() => act('approve_payment', { reason: reason || undefined })}
            className="btn btn-primary text-sm"><CheckCircle2 className="h-4 w-4" aria-hidden />Approve payment</button>
          <button disabled={busy || !pendingSub} onClick={() => act('reject_payment', { reason: reason || 'Verification failed' })}
            className="btn btn-secondary text-sm" style={{ borderColor: 'rgba(248,113,113,0.4)', color: '#f87171' }}>
            <XCircle className="h-4 w-4" aria-hidden />Reject payment</button>
        </div>
        {msg && <p className={`text-xs badge mt-3 ${msg.ok ? 'badge-green' : 'badge-red'}`}>{msg.text}</p>}
      </div>

      {/* One-step: Approve + fill delivery + send in one click (pending orders only) */}
      {pendingSub && (
        <div className="card p-6" style={{ borderColor: 'var(--accent)' }}>
          <h2 className="font-bold text-lg mb-1">⚡ Approve & deliver in one step</h2>
          <p className="text-xs text-muted mb-4">Verify the payment above, fill the VPS details here, and the customer gets everything at once — approval, active order, credentials in dashboard, and email.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { k: 'hostname', l: 'Hostname / IP *' },
              { k: 'rdpPort', l: 'RDP port' },
              { k: 'username', l: 'Username *' },
              { k: 'password', l: 'Password (encrypted at rest)' },
              { k: 'os', l: 'Operating system' },
            ].map((f) => (
              <div key={f.k}>
                <label className="label">{f.l}</label>
                <input className="input" dir="ltr" value={(d as Record<string, string | number>)[f.k] as string ?? ''} onChange={(e) => setD({ ...d, [f.k]: e.target.value })} placeholder={f.k === 'rdpPort' ? '3389' : ''} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="label">Setup instructions (shown to customer)</label>
            <textarea className="input" rows={2} value={d.setupInstructions} onChange={(e) => setD({ ...d, setupInstructions: e.target.value })} placeholder={"e.g. Open Remote Desktop → enter the IP → sign in with the username/password above."} />
          </div>
          <button disabled={busy || !d.hostname || !d.username}
            onClick={() => act('approve_and_deliver', {
              delivery: {
                vpsHost: d.hostname, vpsPort: d.rdpPort ? Number(d.rdpPort) : undefined,
                vpsUsername: d.username, vpsPassword: d.password || undefined,
                vpsOs: d.os || undefined, setupNote: d.setupInstructions || undefined,
              },
            })}
            className="btn btn-primary text-sm mt-4 w-full justify-center">
            <Send className="h-4 w-4" aria-hidden />Approve payment + send VPS details
          </button>
          {(!d.hostname || !d.username) && <p className="text-xs text-muted mt-2">Fill at least Hostname/IP and Username.</p>}
        </div>
      )}

      {/* VPS Delivery form */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">VPS delivery</h2>
        <p className="text-xs text-muted mb-4">Credentials are encrypted at rest (AES-256-GCM) and never appear in logs. Sending marks the order active and notifies the customer.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { k: 'hostname', l: 'Hostname' },
            { k: 'ip', l: 'IP address' },
            { k: 'rdpPort', l: 'RDP port' },
            { k: 'username', l: 'Username' },
            { k: 'password', l: 'Password (encrypted)' },
            { k: 'os', l: 'Operating system' },
            { k: 'specs', l: 'Specs shown to customer' },
          ].map((f) => (
            <div key={f.k}>
              <label className="label">{f.l}</label>
              <input className="input" value={(d as Record<string, string | number>)[f.k] as string ?? ''} dir={f.k === 'password' || f.k === 'ip' ? 'ltr' : undefined}
                onChange={(e) => setD({ ...d, [f.k]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="label">Setup instructions (shown to customer)</label>
          <textarea className="input" rows={3} value={d.setupInstructions} onChange={(e) => setD({ ...d, setupInstructions: e.target.value })} />
        </div>
        <div className="mt-3">
          <label className="label">Private note (admin only)</label>
          <textarea className="input" rows={2} value={d.privateNote} onChange={(e) => setD({ ...d, privateNote: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <button disabled={busy} onClick={() => saveDelivery(false)} className="btn btn-secondary text-sm">Save only</button>
          <button disabled={busy} onClick={() => saveDelivery(true)} className="btn btn-primary text-sm"><Send className="h-4 w-4" aria-hidden />Send VPS details to customer</button>
        </div>

        {data.subscription && (
          <div className="mt-5 pt-5 hairline text-sm">
            <strong>Subscription:</strong> <span className="badge text-xs ms-2">{data.subscription.status}</span>
            <span className="text-muted text-xs ms-2">ends {new Date(data.subscription.end_date).toLocaleDateString()}</span>
            <div className="flex gap-2 mt-3">
              <button disabled={busy} onClick={() => act('mark_active')} className="btn btn-secondary text-xs">Mark active</button>
              <button disabled={busy} onClick={() => act('cancel_order', { reason: reason || 'cancelled by admin' })} className="btn btn-secondary text-xs" style={{ color: '#f87171' }}>Cancel order</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
