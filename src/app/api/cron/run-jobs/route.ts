import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { runSubscriptionJobs } from '@/lib/subscription-jobs';
import { processQueuedEmails } from '@/lib/mail';
import { writeAudit } from '@/lib/auth';

/**
 * Cron / scheduled worker endpoint. Safe to call with:
 *   curl -H "x-cron-secret: $CRON_SECRET" https://host/api/cron/run-jobs
 * or by a logged-in admin.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret');
  const user = await getCurrentUser();
  const authorized = (secret && provided === secret) || user?.role === 'admin';
  if (!authorized) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const result = await runSubscriptionJobs();
  const mail = await processQueuedEmails();
  writeAudit({ actorId: user?.id ?? null, actorRole: user?.role ?? 'system', action: 'cron_run_jobs', entityType: 'system', details: result });

  return NextResponse.json({
    ok: true,
    subscriptions: result,
    email: mail,
    note: 'Run this endpoint hourly (or daily) via an external scheduler.',
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
