import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const db = getDb();
  const ordersRes = await db.query(
    `SELECT o.*, p.name_en AS plan_name FROM orders o JOIN plans p ON p.id = o.plan_id WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [user!.id]
  );
  const orders = ordersRes.rows as Array<Record<string, unknown>>;

  return (
    <div className="card p-6">
      <h2 className="font-bold text-lg mb-4">{t('My Orders', 'طلباتي')}</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted">{t('No orders yet.', 'لا توجد طلبات بعد.')}</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <Link key={o.id as string} href={`/dashboard/orders/${o.order_number}`}
              className="flex flex-wrap items-center gap-3 justify-between rounded-lg p-4 text-sm hover:opacity-90" style={{ background: 'var(--bg-2)' }}>
              <div className="min-w-0">
                <div className="font-mono text-xs">{o.order_number as string}</div>
                <div className="font-semibold mt-1">{(o.plan_name as string)} · ${Number(o.price).toFixed(2)} / {String(o.billing_period)}</div>
                <div className="text-xs text-muted mt-1">{new Date(o.created_at as string).toLocaleDateString()}</div>
              </div>
              <span className="badge text-xs">{String(o.status).replace(/_/g, ' ')}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
