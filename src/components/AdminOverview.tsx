'use client';

import { useEffect, useState } from 'react';
import { Users, ClipboardList, Clock, CheckCircle2, Server, CalendarClock, TrendingUp, LifeBuoy } from 'lucide-react';

type Data = {
  stats: {
    customers: number; totalOrders: number; pendingReview: number; approvedThisMonth: number;
    awaitingVps: number; activeSubs: number; expiringSoon: number; revenueVerified: number; openTickets: number;
  };
  recentActivity: Array<{ action: string; entity_type: string; entity_id: string | null; created_at: string; actor_name: string | null; actor_role: string }>;
};

type CardDef = {
  key: keyof Data['stats'];
  label: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  highlight?: boolean;
  money?: boolean;
};

const CARDS: CardDef[] = [
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'totalOrders', label: 'Total Orders', icon: ClipboardList },
  { key: 'pendingReview', label: 'Awaiting Payment Review', icon: Clock, highlight: true },
  { key: 'approvedThisMonth', label: 'Approved This Month', icon: CheckCircle2 },
  { key: 'awaitingVps', label: 'Awaiting VPS Setup', icon: Server, highlight: true },
  { key: 'activeSubs', label: 'Active Subscriptions', icon: CalendarClock },
  { key: 'revenueVerified', label: 'Verified Revenue (USD)', icon: TrendingUp, money: true },
  { key: 'openTickets', label: 'Open Tickets', icon: LifeBuoy },
];

export function AdminOverview() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => { fetch('/api/admin/overview').then((r) => r.json()).then(setData).catch(() => {}); }, []);

  if (!data) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-4">Dashboard Overview</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CARDS.map((c) => (
            <div key={c.key} className="card p-4" style={c.highlight ? { borderColor: 'var(--accent)' } : undefined}>
              <c.icon className="h-4 w-4 text-[var(--accent-2)] mb-2" aria-hidden />
              <div className="text-2xl font-extrabold">
                {c.money ? `$${(data.stats[c.key] ?? 0).toFixed(2)}` : data.stats[c.key]}
              </div>
              <div className="text-xs text-muted mt-1">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-bold mb-4">Recent customer activity</h2>
        {data.recentActivity.length === 0 ? <p className="text-sm text-muted">No activity yet.</p> : (
          <div className="space-y-2 text-sm">
            {data.recentActivity.map((a, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-2)' }}>
                <span><strong>{a.action}</strong>{a.actor_name ? <> by {a.actor_name} ({a.actor_role})</> : ''}</span>
                <span className="text-xs text-muted">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
