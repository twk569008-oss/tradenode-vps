'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

type Msg = { id: string; sender_role: string; sender_name: string; message: string; created_at: string };

export function TicketThread({ ticketId, locale }: { ticketId: string; locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const [data, setData] = useState<{ ticket: { subject: string; status: string; ticket_number: string }; messages: Msg[] } | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/tickets/${ticketId}/messages`);
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [ticketId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (res.ok) { setReply(''); await load(); }
    } catch {}
    finally { setBusy(false); }
  }

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">{data.ticket.subject}</h2>
          <span className="badge text-xs">{data.ticket.status}</span>
        </div>
        <div className="text-xs text-muted mt-1"><span className="font-mono">{data.ticket.ticket_number}</span></div>
      </div>

      <div className="space-y-3">
        {data.messages.map((m) => (
          <div key={m.id} className={`card p-4 ${m.sender_role === 'admin' ? 'ms-8' : 'me-8'}`} style={m.sender_role === 'admin' ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold">{m.sender_name}{m.sender_role === 'admin' ? ` · ${t('Support', 'الدعم')}` : ''}</span>
              <span className="text-muted">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{m.message}</p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="card p-4 flex gap-2 items-end">
        <textarea className="input flex-1" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000}
          placeholder={t('Write a reply…', 'اكتب رداً…')} />
        <button disabled={busy || !reply.trim()} className="btn btn-primary">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {t('Send', 'إرسال')}
        </button>
      </form>
    </div>
  );
}
