import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const db = getDb();
  const rowsRes = await db.query(
    `SELECT ps.*, o.order_number FROM payment_submissions ps JOIN orders o ON o.id = ps.order_id WHERE o.user_id = $1 ORDER BY ps.submitted_at DESC`,
    [user!.id]
  );
  const rows = rowsRes.rows as Array<Record<string, unknown>>;

  return (
    <div className="card p-6">
      <h2 className="font-bold text-lg mb-4">{t('Payment History', 'سجل المدفوعات')}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">{t('No payments submitted yet.', 'لم تُرسل مدفوعات بعد.')}</p> : (
        <div className="space-y-2 text-sm">
          {rows.map((r) => (
            <div key={r.id as string} className="rounded-lg p-3 flex flex-wrap items-center justify-between gap-2" style={{ background: 'var(--bg-2)' }}>
              <div>
                <Link href={`/dashboard/orders/${r.order_number}`} className="font-mono text-xs text-[var(--accent-2)] hover:underline">{r.order_number as string}</Link>
                <div className="text-xs text-muted mt-1">{String(r.network_code)} · {new Date(r.submitted_at as string).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">${Number(r.amount_usd ?? 0).toFixed(2)}</span>
                <span className="badge text-xs">{String(r.status)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
