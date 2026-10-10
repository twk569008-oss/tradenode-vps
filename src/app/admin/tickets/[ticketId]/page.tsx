'use client';

import { useRef, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import Link from 'next/link';

type Msg = { id: string; sender_role: string; sender_name: string; message: string; created_at: string };
type Data = { ticket: { subject: string; status: string; ticket_number: string; category: string }; messages: Msg[] };

export default function AdminTicketThread() {
  const params = useParams<{ ticketId: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const nextRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    const res = await fetch(`/api/tickets/${params.ticketId}/messages`);
    if (res.ok) setData(await res.json());
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params.ticketId]);

  useEffect(() => { nextRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    await fetch(`/api/tickets/${params.ticketId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: reply.trim() }),
    });
    setReply(''); await load(); setBusy(false);
  }

  async function setStatus(status: string) {
    await fetch('/api/admin/tickets', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: params.ticketId, status }),
    });
    await load();
  }

  if (!data) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/admin/tickets" className="text-xs text-[var(--accent-2)] hover:underline">← Back to tickets</Link>
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-bold">{data.ticket.subject}</h1>
          <div className="flex gap-2">
            <span className="badge text-xs">{data.ticket.status}</span>
            <button onClick={() => setStatus(data.ticket.status === 'closed' ? 'open' : 'closed')} className="btn btn-secondary text-xs">
              {data.ticket.status === 'closed' ? 'Reopen' : 'Close'}
            </button>
          </div>
        </div>
        <div className="text-xs text-muted mt-1"><span className="font-mono">{data.ticket.ticket_number}</span> · {data.ticket.category}</div>
      </div>

      <div className="space-y-3">
        {data.messages.map((m) => (
          <div key={m.id} className={`card p-4 ${m.sender_role === 'admin' ? 'ms-8' : 'me-8'}`} style={m.sender_role === 'admin' ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="flex items-center justify-between mb-2 text-xs">
              <span className="font-semibold">{m.sender_name}{m.sender_role === 'admin' ? ' · Support' : ''}</span>
              <span className="text-muted">{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{m.message}</p>
          </div>
        ))}
        <div ref={nextRef} />
      </div>

      <form onSubmit={send} className="card p-4 flex gap-2 items-end">
        <textarea className="input flex-1" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply as support…" maxLength={4000} />
        <button disabled={busy || !reply.trim()} className="btn btn-primary"><Send className="h-4 w-4" aria-hidden />Send</button>
      </form>
    </div>
  );
}
