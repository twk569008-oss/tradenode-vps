import { cookies } from 'next/headers';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';
import { ShoppingBag, Server, Bell, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CustomerOverview() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);

  const db = getDb();
  const [ordersRes, orderCountRes, vpsCountRes, unreadRes] = await Promise.all([
    db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [user!.id]),
    db.query('SELECT COUNT(*) AS n FROM orders WHERE user_id = $1', [user!.id]),
    db.query(`SELECT COUNT(*) AS n FROM vps_instances v JOIN orders o ON o.id = v.order_id WHERE o.user_id = $1 AND v.sent_to_customer = true`, [user!.id]),
    db.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND is_read = false', [user!.id]),
  ]);
  const orders = ordersRes.rows as Array<Record<string, unknown>>;
  const orderCount = orderCountRes.rows[0] as { n: string | number };
  const vpsCount = vpsCountRes.rows[0] as { n: string | number };
  const unread = unreadRes.rows[0] as { n: string | number };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-1">{t('Welcome back', 'أهلاً بعودتك')}</h2>
        <p className="text-sm text-muted">{user!.name} · {user!.email}</p>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: ShoppingBag, val: Number(orderCount.n), label: t('Orders', 'الطلبات') },
            { icon: Server, val: Number(vpsCount.n), label: t('VPS Servers', 'خوادم') },
            { icon: Bell, val: Number(unread.n), label: t('Unread', 'غير مقروء') },
          ].map((s, i) => (
            <div key={i} className="rounded-lg p-4" style={{ background: 'var(--bg-2)' }}>
              <s.icon className="h-4 w-4 text-[var(--accent-2)] mb-2" aria-hidden />
              <div className="text-2xl font-extrabold">{s.val}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">{t('Recent orders', 'الطلبات الأخيرة')}</h3>
          <Link href="/dashboard/orders" className="text-xs text-[var(--accent-2)] hover:underline">{t('View all', 'عرض الكل')}</Link>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted mb-4">{t('No orders yet. Pick a plan to get started.', 'لا توجد طلبات بعد. اختر خطة للبدء.')}</p>
            <Link href="/plans" className="btn btn-primary text-sm"><Plus className="h-4 w-4" aria-hidden />{t('Create first order', 'أنشئ أول طلب')}</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <Link key={o.id as string} href={`/dashboard/orders/${o.order_number}`} className="flex items-center justify-between rounded-lg p-3 text-sm hover:opacity-90" style={{ background: 'var(--bg-2)' }}>
                <span className="font-mono text-xs">{o.order_number as string}</span>
                <span className="font-semibold">${Number(o.price).toFixed(2)}</span>
                <span className="badge text-xs">{String(o.status).replace(/_/g, ' ')}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
