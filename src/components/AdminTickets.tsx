'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

type Ticket = { id: string; ticket_number: string; subject: string; category: string; status: string; unread_admin: number; updated_at: string; customer_name: string; customer_email: string };

export function AdminTickets() {
  const [rows, setRows] = useState<Ticket[] | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/tickets${unreadOnly ? '?unread=1' : ''}`);
    if (res.ok) setRows((await res.json()).tickets);
  }, [unreadOnly]);
  useEffect(() => { load(); }, [load]);

  if (rows == null) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Support Tickets</h1>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />Only unread
        </label>
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted">No tickets.</p> : (
        <div className="space-y-2">
          {rows.map((t) => (
            <Link key={t.id} href={`/admin/tickets/${t.id}`} className="card card-hover p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm">{t.subject}</strong>
                  {t.unread_admin ? <span className="badge badge-red text-xs">new reply</span> : null}
                  <span className="badge text-xs">{t.status}</span>
                </div>
                <div className="text-xs text-muted mt-1"><span className="font-mono">{t.ticket_number}</span> · {t.customer_name} · {t.category} · {new Date(t.updated_at).toLocaleString()}</div>
              </div>
              <span className="text-xs text-[var(--accent-2)]">Open →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
