import { getDb } from '@/db/db';
import { newId } from '@/lib/auth';
import { processQueuedEmails } from '@/lib/mail';

type QueueEmailOpts = {
  toEmail: string;
  subject: string;
  body: string;             // plain text
  htmlBody?: string;        // rich HTML — stored with a marker prefix
  relatedType?: string;
  relatedId?: string;
};

const HTML_MARKER = 'HTML::';

export async function queueEmail(opts: QueueEmailOpts): Promise<string> {
  const id = newId('em');
  const stored = opts.htmlBody ? `${HTML_MARKER}${opts.htmlBody}` : opts.body;
  await getDb().query(
    `INSERT INTO email_log (id, to_email, subject, body, status, related_type, related_id, created_at)
     VALUES ($1, $2, $3, $4, 'queued', $5, $6, $7)`,
    [id, opts.toEmail, opts.subject, stored, opts.relatedType ?? null, opts.relatedId ?? null, new Date().toISOString()]
  );

  // Fire-and-forget: try to deliver immediately instead of waiting for the
  // next cron run. Silently no-ops when SMTP/Gmail env vars are not set — the
  // message then stays 'queued' in email_log exactly as before (audit-safe).
  void processQueuedEmails(5).catch(() => {});

  return id;
}

export async function notifyUser(opts: { userId: string; type: string; payload?: unknown; emailSubject?: string; emailBody?: string; emailHtml?: string; toEmail?: string }): Promise<string> {
  const id = newId('nt');
  await getDb().query(
    `INSERT INTO notifications (id, user_id, type, payload, is_read, email_sent, created_at)
     VALUES ($1, $2, $3, $4, false, false, $5)`,
    [id, opts.userId, opts.type, opts.payload ? JSON.stringify(safeJson(opts.payload)) : null, new Date().toISOString()]
  );

  if (opts.emailSubject && opts.toEmail) {
    await queueEmail({
      toEmail: opts.toEmail,
      subject: opts.emailSubject,
      body: opts.emailBody ?? '',
      htmlBody: opts.emailHtml,
      relatedType: 'notification',
      relatedId: id,
    });
  }
  return id;
}

function safeJson(v: unknown): unknown {
  try {
    JSON.stringify(v);
    return v;
  } catch {
    return { note: 'unserializable payload' };
  }
}

export function extractHtmlBody(raw: string): string | null {
  if (raw.startsWith(HTML_MARKER)) return raw.slice(HTML_MARKER.length);
  return null;
}
