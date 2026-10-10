'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Copy, Trash2, Pencil, Save } from 'lucide-react';

type Plan = {
  id: string; slug: string; name_en: string; name_ar: string; cpu: string; ram: string; storage: string;
  monthly_price: number; billing_periods: string; billing_discount_quarterly: number | null;
  billing_discount_semiannual: number | null; billing_discount_annual: number | null;
  os: string; is_active: number; is_soldout: number; featured: number; sort_order: number;
};

const EMPTY = { id: '', name_en: '', name_ar: '', cpu: '', ram: '', storage: '', monthly_price: 3, billing_periods: 'monthly,quarterly,semiannual,annual', billing_discount_quarterly: 0.05, billing_discount_semiannual: 0.10, billing_discount_annual: 0.18, os: 'Windows Server (if infrastructure supports)', is_active: false, is_soldout: false, featured: false, sort_order: 200 };

type EditState = { id: string; name_en: string; name_ar: string; cpu: string; ram: string; storage: string; monthly_price: number; billing_periods: string; billing_discount_quarterly: number | null; billing_discount_semiannual: number | null; billing_discount_annual: number | null; os: string; is_active: boolean; is_soldout: boolean; featured: boolean; sort_order: number };

export function AdminPlans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/plans');
    if (res.ok) setPlans((await res.json()).plans);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!editing) return;
    setBusy(true); setMsg(null);
    const method = editing.id ? 'PATCH' : 'POST';
    const body = editing.id ? { ...editing } : { ...editing, name_en: editing.name_en, name_ar: editing.name_ar || editing.name_en };
    try {
      const res = await fetch('/api/admin/plans', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (res.ok) { setEditing(null); await load(); setMsg('Saved.'); }
      else { const er = await res.json().catch(() => ({ error: 'x' })); setMsg(`Failed: ${er.error ?? 'invalid'}`); }
    } catch { setMsg('Network error.'); }
    finally { setBusy(false); }
  }

  async function toggle(p: Plan, field: 'is_active' | 'is_soldout' | 'featured') {
    setBusy(true);
    await fetch('/api/admin/plans', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, [field]: !(p[field] as number) }),
    });
    setBusy(false); await load();
  }

  async function duplicate(p: Plan) {
    setBusy(true);
    await fetch('/api/admin/plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, duplicateOf: p.id }),
    });
    setBusy(false); await load();
  }

  async function remove(p: Plan) {
    if (!confirm(`Delete plan ${p.name_en}? If it has orders, it will be disabled instead.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/plans?id=${p.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({ note: '' }));
    setMsg(d.note ?? 'Deleted.');
    setBusy(false); await load();
  }

  if (plans == null) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Plans</h1>
        <button onClick={() => setEditing({ ...EMPTY })} className="btn btn-primary text-xs"><Plus className="h-3.5 w-3.5" aria-hidden />New plan</button>
      </div>
      {msg && <p className="text-xs badge badge-accent">{msg}</p>}

      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="card p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-sm">{p.name_en}</strong>
                {p.featured ? <span className="badge badge-accent text-xs">featured</span> : null}
                {p.is_soldout ? <span className="badge badge-red text-xs">sold out</span> : !p.is_active ? <span className="badge text-xs">inactive</span> : null}
                {p.is_active && !p.is_soldout ? <span className="badge badge-green text-xs">available</span> : null}
              </div>
              <div className="text-xs text-muted mt-1">
                {p.cpu} · {p.ram} · {p.storage} · ${p.monthly_price}/mo · discounts {Math.round((p.billing_discount_annual ?? 0) * 100)}%yr
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button disabled={busy} onClick={() => toggle(p, 'is_active')} className="btn btn-secondary text-xs">{p.is_active ? 'Disable' : 'Enable'}</button>
              <button disabled={busy} onClick={() => toggle(p, 'is_soldout')} className="btn btn-secondary text-xs">{p.is_soldout ? 'Un-soldout' : 'Mark soldout'}</button>
              <button disabled={busy} onClick={() => toggle(p, 'featured')} className="btn btn-secondary text-xs">{p.featured ? 'Unfeature' : 'Feature'}</button>
              <button disabled={busy} onClick={() => { setEditing({ ...EMPTY, ...p, billing_discount_quarterly: p.billing_discount_quarterly ?? 0, billing_discount_semiannual: p.billing_discount_semiannual ?? 0, billing_discount_annual: p.billing_discount_annual ?? 0, is_active: !!p.is_active, is_soldout: !!p.is_soldout, featured: !!p.featured }); }} className="btn btn-secondary text-xs"><Pencil className="h-3 w-3" aria-hidden />Edit</button>
              <button disabled={busy} onClick={() => duplicate(p)} className="btn btn-secondary text-xs"><Copy className="h-3 w-3" aria-hidden /></button>
              <button disabled={busy} onClick={() => remove(p)} className="btn btn-secondary text-xs" style={{ color: '#f87171' }}><Trash2 className="h-3 w-3" aria-hidden /></button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-auto" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setEditing(null)}>
          <div className="card p-6 w-full max-w-2xl space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold">{editing.id ? 'Edit plan' : 'Create plan'}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { k: 'name_en', l: 'Name (EN)', t: 'text' },
                { k: 'name_ar', l: 'Name (AR)', t: 'text' },
                { k: 'cpu', l: 'CPU', t: 'text' },
                { k: 'ram', l: 'RAM', t: 'text' },
                { k: 'storage', l: 'Storage', t: 'text' },
                { k: 'monthly_price', l: 'Monthly price (USD)', t: 'number' },
                { k: 'billing_periods', l: 'Billing periods (CSV)', t: 'text' },
                { k: 'billing_discount_quarterly', l: 'Quarterly discount (0.06 = 6%)', t: 'number' },
                { k: 'billing_discount_semiannual', l: 'Semiannual discount', t: 'number' },
                { k: 'billing_discount_annual', l: 'Annual discount', t: 'number' },
                { k: 'os', l: 'OS description', t: 'text' },
                { k: 'sort_order', l: 'Sort order', t: 'number' },
              ].map((f) => (
                <div key={f.k}>
                  <label className="label">{f.l}</label>
                  <input className="input" type={f.t}
                    value={String((editing as unknown as Record<string, string | number>)[f.k] ?? '')}
                    onChange={(e) => setEditing({ ...editing, [f.k]: f.t === 'number' ? Number(e.target.value) : e.target.value })} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 text-xs">
              {(['is_active', 'is_soldout', 'featured'] as const).map((k) => (
                <label key={k} className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={editing[k]} onChange={(e) => setEditing({ ...editing, [k]: e.target.checked })} />
                  {k}
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button disabled={busy} onClick={save} className="btn btn-primary text-sm"><Save className="h-4 w-4" aria-hidden />Save</button>
              <button onClick={() => setEditing(null)} className="btn btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
