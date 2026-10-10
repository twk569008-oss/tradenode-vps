import { cookies } from 'next/headers';
import { Server } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';

export const dynamic = 'force-dynamic';

export default async function CustomerVpsPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const db = getDb();

  const vpsRes = await db.query(
    `SELECT v.*, o.order_number FROM vps_instances v JOIN orders o ON o.id = v.order_id
     WHERE o.user_id = $1 AND v.sent_to_customer = true ORDER BY v.sent_at DESC`,
    [user!.id]
  );
  const vps = vpsRes.rows as Array<Record<string, unknown>>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-bold text-lg">{t('My VPS Servers', 'خوادمي')}</h2>
        <span className="badge badge-accent text-xs">{vps.length} {t('delivered', 'خادم مُسلَّم')}</span>
      </div>
      {vps.length === 0 ? (
        <div className="card p-10 text-center">
          <Server className="h-10 w-10 text-muted mx-auto mb-3" aria-hidden />
          <p className="text-sm text-muted max-w-md mx-auto">
            {t('No VPS delivered yet. After payment verification and provisioning, connection details appear here.', 'لم يُسلَّم أي خادم بعد. بعد التحقق من الدفع والتجهيز، ستظهر تفاصيل الاتصال هنا.')}
          </p>
          <a href="/plans" className="btn btn-primary text-xs mt-5">{t('Browse plans', 'تصفح الخطط')}</a>
        </div>
      ) : vps.map((v) => (
        <div key={v.id as string} className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <div className="font-mono text-xs text-muted">{t('Order', 'الطلب')} {v.order_number as string}</div>
              <div className="font-bold text-lg mt-1">{v.hostname as string ?? v.ip as string ?? t('Server', 'خادم')}</div>
            </div>
            <span className={`badge ${String(v.status) === 'active' ? 'badge-green' : String(v.status) === 'suspended' || String(v.status) === 'expired' ? 'badge-red' : 'badge-amber'}`}>
              {t(String(v.status), String(v.status))}
            </span>
          </div>

          {/* Connection credentials — prominent card */}
          <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--bg-2)', border: '1px solid var(--stroke-2)' }}>
            <div className="text-xs font-semibold text-[var(--accent-2)] mb-3">{t('Connection details', 'تفاصيل الاتصال')}</div>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {v.ip ? (
                <div className="flex justify-between items-center gap-2"><span className="text-muted">IP / Host</span><code className="text-xs font-mono" dir="ltr">{String(v.ip)}</code></div>
              ) : null}
              {v.hostname && v.ip ? <div className="flex justify-between items-center gap-2"><span className="text-muted">{t('Hostname', 'اسم الخادم')}</span><code className="text-xs font-mono" dir="ltr">{String(v.hostname)}</code></div> : null}
              {v.rdp_port ? <div className="flex justify-between items-center gap-2"><span className="text-muted">RDP {t('port', 'المنفذ')}</span><code className="text-xs font-mono" dir="ltr">{String(v.rdp_port)}</code></div> : null}
              {v.username ? <div className="flex justify-between items-center gap-2"><span className="text-muted">{t('Username', 'المستخدم')}</span><code className="text-xs font-mono" dir="ltr">{String(v.username)}</code></div> : null}
              {v.os ? <div className="flex justify-between items-center gap-2"><span className="text-muted">OS</span><span className="text-xs">{String(v.os)}</span></div> : null}
              {v.specs ? <div className="flex justify-between items-center gap-2"><span className="text-muted">{t('Specs', 'المواصفات')}</span><span className="text-xs">{String(v.specs)}</span></div> : null}
            </div>
          </div>

          {/* Timeline row: start / expiry + renewal banner */}
          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
            {v.sent_at ? <div className="flex justify-between rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">{t('Delivered', 'تاريخ التسليم')}</span><span className="text-xs">{new Date(v.sent_at as string).toLocaleDateString()}</span></div> : null}
            {v.expiration_date ? <div className="flex justify-between rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">{t('Expires', 'ينتهي')}</span><span className="text-xs font-semibold">{new Date(v.expiration_date as string).toLocaleDateString()}</span></div> : null}
          </div>
          {(() => {
            const exp = v.expiration_date ? new Date(v.expiration_date as string).getTime() : 0;
            const daysLeft = exp ? Math.ceil((exp - Date.now()) / 86400_000) : null;
            if (daysLeft === null || daysLeft > 7) return null;
            return (
              <div className="mb-4 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }}>
                <div className="text-sm">
                  <b>{daysLeft <= 0
                    ? t('Your server has expired. Place a renewal order to keep it running.', 'انتهت مدة خادمك. أنشئ طلب تجديد لإبقائه يعمل.')
                    : t(`Your server expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`, `ينتهي خادمك بعد ${daysLeft} يوم.`)}</b>
                  <p className="text-xs text-muted mt-1">{t('Renew by ordering the same plan again — provisioning keeps your existing server.', 'جدد بطلب نفس الخطة مرة أخرى — يبقى خادمك الحالي كما هو.')}</p>
                </div>
                <a href="/plans" className="btn btn-primary !py-2 !px-4 text-xs shrink-0">{t('Renew / extend now', 'تجديد / تمديد الآن')}</a>
              </div>
            );
          })()}

          {v.setup_instructions ? (
            <div className="rounded-lg p-4 mb-3" style={{ background: 'var(--bg-2)' }}>
              <div className="text-xs font-semibold mb-2">{t('Setup instructions', 'تعليمات الإعداد')}</div>
              <p className="text-xs text-muted whitespace-pre-wrap">{String(v.setup_instructions)}</p>
            </div>
          ) : null}

          <div className="text-xs badge badge-amber mt-1">
            {t('Password: delivered separately by the support team. Change it after first login.', 'كلمة المرور: تُسلَّم بشكل منفصل من فريق الدعم. غيّرها بعد أول تسجيل دخول.')}
          </div>
        </div>
      ))}
    </div>
  );
}
