import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const db = getDb();
  const rowsRes = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100', [user!.id]);
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [user!.id]);
  const rows = rowsRes.rows as Array<Record<string, unknown>>;

  return (
    <div className="card p-6">
      <h2 className="font-bold text-lg mb-4">{t('Notifications', 'الإشعارات')}</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">{t('No notifications yet.', 'لا توجد إشعارات بعد.')}</p> : (
        <div className="space-y-2">
          {rows.map((n) => (
            <div key={n.id as string} className="rounded-lg p-3 text-sm" style={{ background: 'var(--bg-2)' }}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{String(n.type).replace(/_/g, ' ')}</span>
                <span className="text-xs text-muted">{new Date(n.created_at as string).toLocaleString()}</span>
              </div>
              {n.payload ? <p className="text-xs text-muted mt-1">{String(n.payload).slice(0, 240)}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
