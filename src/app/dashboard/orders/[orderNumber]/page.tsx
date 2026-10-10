import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { getDb } from '@/db/db';
import { OrderTimeline } from '@/components/OrderTimeline';

export const dynamic = 'force-dynamic';

export default async function CustomerOrderDetail({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);

  const db = getDb();
  const orderRes = await db.query(
    `SELECT o.*, p.name_en AS plan_name, p.cpu, p.ram, p.storage, p.os AS plan_os
     FROM orders o JOIN plans p ON p.id = o.plan_id
     WHERE o.order_number = $1 AND o.user_id = $2`,
    [orderNumber, user.id]
  );
  const order = orderRes.rows[0] as Record<string, unknown> | undefined;
  if (!order) notFound();

  const subsRes = await db.query('SELECT * FROM payment_submissions WHERE order_id = $1 ORDER BY submitted_at DESC', [order.id as string]);
  const vpsRes = await db.query('SELECT * FROM vps_instances WHERE order_id = $1 AND sent_to_customer = true', [order.id as string]);
  const subscriptionRes = await db.query('SELECT * FROM subscriptions WHERE order_id = $1', [order.id as string]);
  const subs = subsRes.rows as Array<Record<string, unknown>>;
  const vps = vpsRes.rows[0] as Record<string, unknown> | undefined;
  const subscription = subscriptionRes.rows[0] as Record<string, unknown> | undefined;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <div className="font-mono text-xs text-muted">{t('Order number', 'رقم الطلب')}</div>
            <div className="text-lg font-bold">{orderNumber}</div>
          </div>
          <span className="badge badge-accent">{String(order.status).replace(/_/g, ' ')}</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            { k: t('Plan', 'الخطة'), v: String(order.plan_name) },
            { k: 'CPU', v: String(order.cpu) },
            { k: t('Memory', 'الذاكرة'), v: String(order.ram) },
            { k: t('Storage', 'التخزين'), v: String(order.storage) },
            { k: t('Billing period', 'الفترة'), v: String(order.billing_period) },
            { k: t('Price (USD)', 'السعر (USD)'), v: `$${Number(order.price).toFixed(2)}` },
            { k: t('Created', 'تم الإنشاء'), v: new Date(order.created_at as string).toLocaleString() },
          ].map((x, i) => (
            <div key={i} className="flex justify-between rounded-lg p-3" style={{ background: 'var(--bg-2)' }}>
              <span className="text-muted">{x.k}</span><span className="font-semibold">{x.v}</span>
            </div>
          ))}
        </div>

        {order.status === 'pending_payment' && (
          <a href={`/payment/${orderNumber}`} className="btn btn-primary mt-5">{t('Complete payment →', 'إتمام الدفع →')}</a>
        )}

        {order.status === 'under_review' && (
          <div className="mt-5 rounded-lg p-4" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.35)' }}>
            <p className="text-sm font-semibold text-amber-400">{t('Your order is queued for a human payment review. We usually finish within a business day — timings are not guaranteed.', 'طلبك في قائمة مراجعة الدفع البشرية. عادةً ننتهي خلال يوم عمل، لكن التوقيت ليس مضموناً.')}</p>
            <p className="text-xs text-muted mt-1">{t('You will receive a dashboard notification the moment it is approved or rejected.', 'ستصلك إشعارات لوحة التحكم فور الموافقة أو الرفض.')}</p>
          </div>
        )}

        {order.status === 'payment_rejected' && (
          <div className="mt-5 rounded-lg p-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)' }}>
            <p className="text-sm font-semibold text-red-400">{t('Payment was rejected. Reason:', 'تم رفض الدفعة. السبب:')}</p>
            <p className="text-sm mt-1">{String(order.rejection_reason ?? 'No reason recorded — contact support.')}</p>
            <div className="mt-4 text-sm space-y-2">
              <p className="font-semibold">{t('What you can do next', 'ما يمكنك فعله الآن')}:</p>
              <ul className="list-disc ps-5 text-xs text-muted space-y-1">
                <li>{t('Check the screenshot is clear and shows the amount, network, and recipient address.', 'تأكد أن لقطة الشاشة واضحة وتظهر المبلغ والشبكة وعنوان المستلم.')}</li>
                <li>{t('Check the TX hash is complete and the transaction really exists on the selected network.', 'تأكد أن رمز العملية (TX hash) كامل وأن العملية موجودة فعلاً على الشبكة المختارة.')}</li>
                <li>{t('Confirm you sent on the right network for this deposit address.', 'تأكد أنك أرسلت عبر الشبكة الصحيحة لعنوان الإيداع هذا.')}</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <a href={`/payment/${orderNumber}/proof`} className="btn btn-primary text-xs">{t('Re-upload payment proof', 'أعد رفع إثبات الدفع')}</a>
              <a href="/dashboard/tickets" className="btn btn-secondary text-xs">{t('Open a support ticket', 'افتح تذكرة دعم')}</a>
              <Link href="/plans" className="btn btn-secondary text-xs">{t('Browse other plans', 'تصفح خططاً أخرى')}</Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-bold mb-4">{t('Order progress', 'مسار الطلب')}</h3>
          <OrderTimeline status={String(order.status)} locale={locale} />
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-bold mb-4">{t('Payment submissions', 'إثباتات الدفع')}</h3>
            {subs.length === 0 ? <p className="text-sm text-muted">{t('Nothing submitted yet.', 'لم يتم رفع أي إثبات بعد.')}</p> : (
              <div className="space-y-2 text-sm">
                {subs.map((s) => (
                  <div key={s.id as string} className="rounded-lg p-3" style={{ background: 'var(--bg-2)' }}>
                    <div className="flex justify-between mb-1"><span>{String(s.network_code)}</span><span className="badge text-xs">{String(s.status)}</span></div>
                    <div className="text-xs text-muted font-mono" dir="ltr">{String(s.transaction_hash ?? '—')}</div>
                    <div className="text-xs text-muted mt-1">{new Date(s.submitted_at as string).toLocaleString()}</div>
                    {s.reviewer_note ? <div className="text-xs mt-1">{t('Reviewer note', 'ملاحظة المراجع')}: {String(s.reviewer_note)}</div> : null}
                    {s.screenshot_storage_key ? (
                      <a className="text-xs text-[var(--accent-2)] hover:underline" href={`/api/customer/proof/${s.id as string}`}>
                        {t('View uploaded proof', 'عرض الإثبات المرفوع')}
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {vps && (
            <div className="card p-6">
              <h3 className="font-bold mb-4">{t('Your VPS', 'الخادم الخاص بك')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted">{t('Status', 'الحالة')}</span><span className="font-semibold">{String(vps.status)}</span></div>
                {vps.hostname ? <div className="flex justify-between"><span className="text-muted">{t('Host', 'المضيف')}</span><span className="font-mono">{String(vps.hostname)}</span></div> : null}
                {vps.ip ? <div className="flex justify-between"><span className="text-muted">IP</span><span className="font-mono">{String(vps.ip)}</span></div> : null}
                {vps.rdp_port ? <div className="flex justify-between"><span className="text-muted">{t('RDP port', 'منفذ RDP')}</span><span className="font-mono">{String(vps.rdp_port)}</span></div> : null}
                {vps.username ? <div className="flex justify-between"><span className="text-muted">{t('Username', 'اسم المستخدم')}</span><span className="font-mono">{String(vps.username)}</span></div> : null}
                {vps.os ? <div className="flex justify-between"><span className="text-muted">OS</span><span>{String(vps.os)}</span></div> : null}
                {vps.setup_instructions ? <p className="text-xs text-muted pt-2 whitespace-pre-wrap">{String(vps.setup_instructions)}</p> : null}
              </div>
            </div>
          )}

          {subscription && (
            <div className="card p-6">
              <h3 className="font-bold mb-3">{t('Subscription', 'الاشتراك')}</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted">{t('Status', 'الحالة')}</span><span className="font-semibold">{String(subscription.status)}</span></div>
                <div className="flex justify-between"><span className="text-muted">{t('Starts', 'البداية')}</span><span>{new Date(subscription.start_date as string).toLocaleDateString()}</span></div>
                <div className="flex justify-between"><span className="text-muted">{t('Ends', 'النهاية')}</span><span>{new Date(subscription.end_date as string).toLocaleDateString()}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
