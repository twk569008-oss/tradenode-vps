import { getDb } from '@/db/db';
import { extractHtmlBody } from '@/lib/notify';

/**
 * Deliver queued emails. SMTP is optional: if env is not present, messages
 * stay 'queued' in email_log for an admin to inspect. No paid service required.
 */
export async function processQueuedEmails(limit = 20): Promise<{ sent: number; failed: number }> {
  const hasSmtp = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!hasSmtp) return { sent: 0, failed: 0 };

  const db = getDb();
  const res = await db.query(
    `SELECT id, to_email, subject, body FROM email_log WHERE status = 'queued' ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
  const rows = res.rows as Array<{ id: string; to_email: string; subject: string; body: string }>;
  if (rows.length === 0) return { sent: 0, failed: 0 };

  let transport: { sendMail(opts: Record<string, unknown>): Promise<unknown> } | null = null;
  try {
    const mod: any = await eval('import("nodemailer")');
    transport = mod.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER as string, pass: process.env.SMTP_PASS as string },
    });
  } catch {
    return { sent: 0, failed: 0 };
  }
  if (!transport) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (const m of rows) {
    try {
      const html = extractHtmlBody(m.body);
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? 'TradeNode VPS <no-reply@localhost>',
        to: m.to_email,
        subject: m.subject,
        text: html ? m.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000) : m.body,
        html: html ?? undefined,
      });
      await db.query(`UPDATE email_log SET status = 'sent' WHERE id = $1`, [m.id]);
      sent++;
    } catch (e) {
      await db.query(`UPDATE email_log SET status = 'failed' WHERE id = $1`, [m.id]);
      failed++;
      console.error('[mail] send failed:', e instanceof Error ? e.message : e);
    }
  }
  return { sent, failed };
}
