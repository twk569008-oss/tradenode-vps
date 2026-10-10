import Link from 'next/link';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';
import { NewTicketButton } from '@/components/NewTicketButton';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const db = getDb();
  const ticketsRes = await db.query(`SELECT * FROM tickets WHERE user_id = $1 ORDER BY updated_at DESC`, [user!.id]);
  const tickets = ticketsRes.rows as Array<Record<string, unknown>>;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-bold text-lg">{t('Support Tickets', 'تذاكر الدعم')}</h2>
        <NewTicketButton locale={locale} />
      </div>
      {tickets.length === 0 ? <p className="text-sm text-muted">{t('No tickets yet. Open one below if you need help.', 'لا توجد تذاكر. افتح واحدة إذا احتجت مساعدة.')}</p> : (
        <div className="space-y-2 text-sm">
          {tickets.map((tk) => (
            <Link key={tk.id as string} href={`/dashboard/tickets/${tk.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-4 hover:opacity-90" style={{ background: 'var(--bg-2)' }}>
              <div className="min-w-0">
                <div className="font-semibold truncate">{String(tk.subject)}</div>
                <div className="text-xs text-muted mt-1">
                  <span className="font-mono">{tk.ticket_number as string}</span> · {String(tk.category)} · {new Date(tk.updated_at as string).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {Number(tk.unread_customer) > 0 ? <span className="badge badge-red text-xs">{t('New reply', 'رد جديد')}</span> : null}
                <span className="badge text-xs">{String(tk.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
