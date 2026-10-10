'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save, Plus, Power } from 'lucide-react';

type Net = { id: string; code: string; name_en: string; name_ar: string; network_chain: string; deposit_address: string; is_active: number; confirmations_required: number };
type Coupon = { id: string; code: string; discount_type: string; discount_value: number; max_uses: number | null; used_count: number; expires_at: string | null; is_active: number };

export function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [allowedKeys, setAllowedKeys] = useState<string[]>([]);
  const [networks, setNetworks] = useState<Net[] | null>(null);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_type: 'percent', discount_value: 10, max_uses: '' });

  const load = useCallback(async () => {
    const [s, n, c] = await Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/networks').then((r) => r.json()).catch(() => null),
      fetch('/api/admin/coupons').then((r) => r.json()).catch(() => null),
    ]);
    if (s) { setSettings(s.settings); setAllowedKeys(s.allowedKeys); }
    if (n) setNetworks(n.networks);
    if (c) setCoupons(c.coupons);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    setBusy(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: settings }),
    });
    setMsg(res.ok ? 'Settings saved.' : 'Failed.'); setBusy(false);
  }
  async function saveNetwork(n: Net) {
    setBusy(true);
    await fetch('/api/admin/networks', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: n.id, deposit_address: n.deposit_address, is_active: !!n.is_active, confirmations_required: n.confirmations_required }),
    });
    setMsg(`Saved network ${n.code}.`); setBusy(false);
  }
  async function createCoupon() {
    setBusy(true);
    await fetch('/api/admin/coupons', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newCoupon.code, discount_type: newCoupon.discount_type, discount_value: Number(newCoupon.discount_value),
        max_uses: newCoupon.max_uses ? Number(newCoupon.max_uses) : null, expires_at: null,
      }),
    });
    setNewCoupon({ code: '', discount_type: 'percent', discount_value: 10, max_uses: '' });
    setBusy(false); await load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings & Payments</h1>
      {msg && <p className="text-xs badge badge-accent">{msg}</p>}

      <div className="card p-6 space-y-3">
        <h2 className="font-bold">Site settings</h2>
        {allowedKeys.map((k) => (
          <div key={k}>
            <label className="label">{k}</label>
            <input className="input" value={settings[k] ?? ''} onChange={(e) => setSettings({ ...settings, [k]: e.target.value })} />
          </div>
        ))}
        <button disabled={busy} onClick={saveSettings} className="btn btn-primary text-sm"><Save className="h-4 w-4" aria-hidden />Save settings</button>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-bold">Payment networks</h2>
        <p className="text-xs text-muted">Verify each address yourself before editing. Toggling a network off hides it at checkout.</p>
        {networks == null ? <p className="text-sm text-muted">Loading…</p> : networks.map((n) => (
          <div key={n.id} className="rounded-lg p-4 space-y-2" style={{ background: 'var(--bg-2)' }}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{n.name_en} · {n.network_chain}</div>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={!!n.is_active} onChange={(e) => setNetworks(networks.map((x) => x.id === n.id ? { ...x, is_active: e.target.checked ? 1 : 0 } : x))} />active
              </label>
            </div>
            <input className="input font-mono text-xs" value={n.deposit_address} dir="ltr"
              onChange={(e) => setNetworks(networks.map((x) => x.id === n.id ? { ...x, deposit_address: e.target.value } : x))} />
            <div className="flex items-center gap-2">
              <input type="number" className="input w-24" value={n.confirmations_required} min={0}
                onChange={(e) => setNetworks(networks.map((x) => x.id === n.id ? { ...x, confirmations_required: Number(e.target.value) } : x))} />
              <span className="text-xs text-muted">confirmations</span>
              <button disabled={busy} onClick={() => saveNetwork(n)} className="btn btn-primary text-xs ms-auto"><Save className="h-3 w-3" aria-hidden />Save</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-6 space-y-3">
        <h2 className="font-bold">Coupons</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]"><label className="label">Code</label><input className="input" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} placeholder="SAVE10" /></div>
          <div><label className="label">Type</label>
            <select className="input" value={newCoupon.discount_type} onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}>
              <option value="percent">% off</option><option value="fixed">$ off</option>
            </select></div>
          <div className="w-24"><label className="label">Value</label><input type="number" className="input" value={newCoupon.discount_value} onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })} /></div>
          <div className="w-24"><label className="label">Max uses</label><input type="number" className="input" value={newCoupon.max_uses} onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })} placeholder="∞" /></div>
          <button disabled={busy || !newCoupon.code} onClick={createCoupon} className="btn btn-primary text-sm"><Plus className="h-4 w-4" aria-hidden />Add</button>
        </div>
        {coupons == null ? <p className="text-sm text-muted">Loading…</p> : coupons.length === 0 ? <p className="text-sm text-muted">No coupons.</p> : (
          <div className="space-y-2 text-sm">
            {coupons.map((c) => (
              <div key={c.id} className="rounded-lg p-3 flex flex-wrap items-center justify-between gap-2" style={{ background: 'var(--bg-2)' }}>
                <div>
                  <span className="font-mono font-semibold">{c.code}</span>
                  <span className="text-muted text-xs ms-2">{c.discount_type === 'percent' ? `${c.discount_value}%` : `$${c.discount_value}`} off · used {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}</span>
                </div>
                <button disabled={busy} onClick={async () => {
                  await fetch('/api/admin/coupons', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, isActive: !c.is_active }) });
                  await load();
                }} className="btn btn-secondary text-xs"><Power className="h-3 w-3" aria-hidden />{c.is_active ? 'Disable' : 'Enable'}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
