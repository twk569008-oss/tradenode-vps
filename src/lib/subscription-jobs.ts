import { getDb } from '@/db/db';
import { notifyUser, queueEmail } from '@/lib/notify';
import { writeAudit } from '@/lib/auth';
import { subscriptionReminderEmail, subscriptionExpiredEmail } from '@/lib/email-templates';

/**
 * Run once per clock cycle (cron or manual endpoint). Sends:
 *  • reminder at 7 days (and 3 days, 1 day as fallback) before end_date
 *  • expiry email after end_date once
 * Idempotent by writing audit_logs rows keyed with the day boundary.
 */
export async function runSubscriptionJobs(): Promise<{ reminders: number; expiries: number }> {
  const db = getDb();
  const now = new Date();
  const nowIso = now.toISOString();
  const dayIso = now.toISOString().slice(0, 10);

  let reminders = 0;
  let expiries = 0;

  // ── Expiring soon ──────────────────────────────────────
  const expiringRes = await db.query(
    `SELECT s.id, s.end_date, o.order_number, o.user_id, u.email, u.locale
     FROM subscriptions s
     JOIN orders o ON o.id = s.order_id
     JOIN users u ON u.id = o.user_id
     WHERE s.status = 'active' AND s.end_date BETWEEN $1 AND $2`,
    [nowIso, new Date(now.getTime() + 7 * 86400_000).toISOString()]
  );
  const expiring = expiringRes.rows as Array<{ id: string; end_date: string; order_number: string; user_id: string; email: string; locale: string }>;

  for (const s of expiring) {
    const daysLeft = Math.max(0, Math.ceil((new Date(s.end_date).getTime() - now.getTime()) / 86400_000));
    if (![7, 3, 1].includes(daysLeft)) continue;

    const alreadyRes = await db.query(
      `SELECT 1 FROM audit_logs WHERE entity_id = $1 AND action = 'renewal_reminder_sent' AND details::text LIKE $2 LIMIT 1`,
      [s.id, `%${dayIso}%`]
    );
    if (alreadyRes.rows.length > 0) continue;

    const lang = (s.locale === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
    const html = subscriptionReminderEmail(s.order_number, s.end_date, daysLeft, lang);
    await queueEmail({
      toEmail: s.email,
      subject: lang === 'ar'
        ? `⏳ TradeNode VPS — اشتراكك ينتهي بعد ${daysLeft} يوم`
        : `⏳ TradeNode VPS — your subscription ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      body: lang === 'ar' ? `اشتراك الطلب ${s.order_number} ينتهي في ${new Date(s.end_date).toLocaleDateString('ar')}. قم بالتجديد من لوحتك.` : `Order ${s.order_number} expires on ${new Date(s.end_date).toLocaleDateString()}. Renew from your dashboard.`,
      htmlBody: html,
      relatedType: 'subscription',
      relatedId: s.id,
    });
    await notifyUser({ userId: s.user_id, type: 'renewal_reminder', payload: { orderNumber: s.order_number, daysLeft, endDate: s.end_date } });
    await writeAudit({ actorId: null, actorRole: 'system', action: 'renewal_reminder_sent', entityType: 'subscription', entityId: s.id, details: { dayIso, daysLeft } });
    reminders++;
  }

  // ── Expired ─────────────────────────────────────────────
  const expiredRes = await db.query(
    `SELECT s.id, s.end_date, o.order_number, o.user_id, u.email, u.locale
     FROM subscriptions s
     JOIN orders o ON o.id = s.order_id
     JOIN users u ON u.id = o.user_id
     WHERE s.status = 'active' AND s.end_date < $1`,
    [nowIso]
  );
  const expired = expiredRes.rows as Array<{ id: string; end_date: string; order_number: string; user_id: string; email: string; locale: string }>;

  for (const s of expired) {
    const lang = (s.locale === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
    await db.query(`UPDATE subscriptions SET status = 'expired', updated_at = $1 WHERE id = $2`, [nowIso, s.id]);
    await db.query(`UPDATE vps_instances SET status = 'expired' WHERE order_id = (SELECT id FROM orders WHERE order_number = $1)`, [s.order_number]);
    await db.query(`UPDATE orders SET status = 'expired', updated_at = $1 WHERE order_number = $2`, [nowIso, s.order_number]);

    const html = subscriptionExpiredEmail(s.order_number, s.end_date, lang);
    await queueEmail({
      toEmail: s.email,
      subject: lang === 'ar' ? '🔔 TradeNode VPS — انتهى اشتراكك' : '🔔 TradeNode VPS — your subscription has expired',
      body: lang === 'ar' ? `انتهى اشتراك الطلب ${s.order_number}. قم بالتجديد لاستعادة الوصول.` : `Order ${s.order_number}'s subscription has expired. Renew to regain access.`,
      htmlBody: html,
      relatedType: 'subscription',
      relatedId: s.id,
    });
    await notifyUser({ userId: s.user_id, type: 'subscription_expired', payload: { orderNumber: s.order_number, endDate: s.end_date } });
    await writeAudit({ actorId: null, actorRole: 'system', action: 'subscription_expired_notified', entityType: 'subscription', entityId: s.id, details: { dayIso } });
    expiries++;
  }

  return { reminders, expiries };
}
