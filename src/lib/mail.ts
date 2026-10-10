import { getDb } from '@/db/db';
import { extractHtmlBody } from '@/lib/notify';

/* ------------------------------------------------------------------ */
/* Gmail API fallback — Railway blocks outbound SMTP ports (587/465),  */
/* but 443 (HTTPS) is always open. When Gmail OAuth env vars exist we   */
/* send through the Gmail REST API over HTTPS; otherwise we fall back   */
/* to classic SMTP. Failure of one method retries via the other.        */
/* ------------------------------------------------------------------ */

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const GMAIL_OAUTH = 'https://oauth2.googleapis.com/token';

type SendArgs = { to: string; subject: string; html?: string; text: string };

function buildMime(args: SendArgs, from: string): string {
  const boundary = 'tnvps-' + Math.random().toString(36).slice(2);
  const body = args.html
    ? `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${args.text}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${args.html}\r\n\r\n--${boundary}--`
    : args.text;
  const headers =
    `From: ${from}\r\nTo: ${args.to}\r\n` +
    `Subject: ${args.subject}\r\n` +
    `MIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
  return headers + body;
}

async function getAccessToken(): Promise<string | null> {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) return null;
  try {
    const res = await fetch(GMAIL_OAUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GMAIL_CLIENT_ID,
        client_secret: GMAIL_CLIENT_SECRET,
        refresh_token: GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

async function sendViaGmailApi(args: SendArgs, from: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    if (!token) return false;
    const mime = buildMime(args, from);
    const b64url = Buffer.from(mime, 'utf8').toString('base64url');
    const res = await fetch(GMAIL_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64url }),
    });
    return res.ok;
  } catch (e) {
    console.error('[gmail-api] send failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

async function sendViaSmtp(args: SendArgs, from: string): Promise<boolean> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return false;
  try {
    const mod = (await eval('import("nodemailer")')) as {
      createTransport(opts: Record<string, unknown>): { sendMail(opts: Record<string, unknown>): Promise<unknown> };
    };
    const transport = mod.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER as string, pass: process.env.SMTP_PASS as string },
      connectionTimeout: 15000,
    });
    await transport.sendMail({ from, to: args.to, subject: args.subject, text: args.text, html: args.html ?? undefined });
    return true;
  } catch (e) {
    console.error('[smtp] send failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Deliver queued emails. If neither Gmail OAuth nor SMTP env is present,
 * messages stay 'queued' in email_log for an admin to inspect.
 */
export async function processQueuedEmails(limit = 20): Promise<{ sent: number; failed: number }> {
  const hasAnyConfig =
    (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) ||
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  if (!hasAnyConfig) return { sent: 0, failed: 0 };

  const db = getDb();
  const res = await db.query(
    `SELECT id, to_email, subject, body FROM email_log WHERE status = 'queued' ORDER BY created_at ASC LIMIT $1`,
    [limit]
  );
  const rows = res.rows as Array<{ id: string; to_email: string; subject: string; body: string }>;
  if (rows.length === 0) return { sent: 0, failed: 0 };

  const from = process.env.SMTP_FROM ?? `TradeNode VPS <${process.env.SMTP_USER ?? 'no-reply@localhost'}>`;

  let sent = 0;
  let failed = 0;
  for (const m of rows) {
    const html = extractHtmlBody(m.body);
    const text = html ? m.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000) : m.body;
    const args: SendArgs = { to: m.to_email, subject: m.subject, html: html ?? undefined, text };
    // Gmail API first (works where SMTP ports are blocked), then SMTP.
    const ok = (await sendViaGmailApi(args, from)) || (await sendViaSmtp(args, from));
    if (ok) {
      await db.query(`UPDATE email_log SET status = 'sent' WHERE id = $1`, [m.id]);
      sent++;
    } else {
      await db.query(`UPDATE email_log SET status = 'failed' WHERE id = $1`, [m.id]);
      failed++;
    }
  }
  return { sent, failed };
}
