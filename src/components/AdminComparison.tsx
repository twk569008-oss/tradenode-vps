'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';

type Cmp = {
  id: string; our_plan_id: string | null; competitor_name: string; competitor_plan: string; competitor_specs: string;
  competitor_price: number; billing_period: string; source_url: string; last_checked: string; our_price: number;
  pct_diff: number; is_public: number;
};

const EMPTY = { competitor_name: '', competitor_plan: '', competitor_specs: '', competitor_price: 5, billing_period: 'monthly', source_url: '', our_price: 2, our_plan_id: null as string | null };

export function AdminComparison() {
  const [rows, setRows] = useState<Cmp[] | null>(null);
  const [newRow, setNewRow] = useState({ ...EMPTY });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/comparison');
    if (res.ok) setRows((await res.json()).comparisons);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true);
    await fetch('/api/admin/comparison', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRow),
    });
    setNewRow({ ...EMPTY }); setBusy(false); await load();
  }

  async function saveRow(c: Cmp) {
    setBusy(true);
    await fetch('/api/admin/comparison', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, competitor_price: c.competitor_price, our_price: c.our_price, source_url: c.source_url, is_public: !!c.is_public, competitor_specs: c.competitor_specs, last_checked: new Date().toISOString() }),
    });
    setBusy(false); await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this comparison entry?')) return;
    await fetch(`/api/admin/comparison?id=${id}`, { method: 'DELETE' }); await load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Pricing Comparison Engine</h1>
      <p className="text-xs text-muted max-w-2xl">
        Record competitor prices against ours. A comparison is publicly shown only when it has a source URL, comparable specs, and was checked within 30 days — no unsupported claims.
      </p>

      <div className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">Add competitor entry</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          <input className="input" placeholder="Competitor name" value={newRow.competitor_name} onChange={(e) => setNewRow({ ...newRow, competitor_name: e.target.value })} />
          <input className="input" placeholder="Plan name" value={newRow.competitor_plan} onChange={(e) => setNewRow({ ...newRow, competitor_plan: e.target.value })} />
          <input className="input" placeholder="Specs (e.g. 2 vCPU / 4 GB / 50 GB)" value={newRow.competitor_specs} onChange={(e) => setNewRow({ ...newRow, competitor_specs: e.target.value })} />
          <input className="input" type="number" placeholder="Their price" value={newRow.competitor_price} onChange={(e) => setNewRow({ ...newRow, competitor_price: Number(e.target.value) })} />
          <select className="input" value={newRow.billing_period} onChange={(e) => setNewRow({ ...newRow, billing_period: e.target.value })}>
            <option value="monthly">monthly</option><option value="quarterly">quarterly</option><option value="semiannual">semiannual</option><option value="annual">annual</option>
          </select>
          <input className="input" type="number" placeholder="Our price" value={newRow.our_price} onChange={(e) => setNewRow({ ...newRow, our_price: Number(e.target.value) })} />
          <input className="input col-span-3" placeholder="Source URL (required to publish)" value={newRow.source_url} onChange={(e) => setNewRow({ ...newRow, source_url: e.target.value })} />
        </div>
        <button disabled={busy || !newRow.competitor_name} onClick={create} className="btn btn-primary text-sm"><Plus className="h-4 w-4" aria-hidden />Add</button>
      </div>

      {rows == null ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div> : rows.length === 0 ? <p className="text-sm text-muted">Nothing recorded yet.</p> : (
        <div className="space-y-2 text-sm">
          {rows.map((c) => {
            const pct = c.our_price && c.competitor_price ? Math.round(((c.our_price - c.competitor_price) / c.competitor_price) * 1000) / 10 : 0;
            return (
              <div key={c.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <strong>{c.competitor_name} · {c.competitor_plan}</strong>
                  <span className={`badge text-xs ${pct < 0 ? 'badge-green' : 'badge-amber'}`}>{pct < 0 ? `${Math.abs(pct)}% cheaper` : pct > 0 ? `${pct}% more` : 'same'}</span>
                </div>
                <div className="text-xs text-muted mb-2">{c.competitor_specs} · {c.billing_period} · checked {new Date(c.last_checked).toLocaleDateString()}</div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input type="number" className="input text-xs" value={c.competitor_price} onChange={(e) => setRows(rows.map((x) => x.id === c.id ? { ...x, competitor_price: Number(e.target.value) } : x))} />
                  <input type="number" className="input text-xs" value={c.our_price} onChange={(e) => setRows(rows.map((x) => x.id === c.id ? { ...x, our_price: Number(e.target.value) } : x))} />
                  <input className="input text-xs" placeholder="source URL" value={c.source_url} onChange={(e) => setRows(rows.map((x) => x.id === c.id ? { ...x, source_url: e.target.value } : x))} />
                </div>
                <div className="flex gap-2 mt-2">
                  <button disabled={busy} onClick={() => saveRow(c)} className="btn btn-secondary text-xs">Update check date</button>
                  <button onClick={() => remove(c.id)} className="btn btn-secondary text-xs" style={{ color: '#f87171' }}><Trash2 className="h-3 w-3" aria-hidden /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
