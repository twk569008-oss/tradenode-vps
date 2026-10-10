import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { createPasswordResetToken, writeAudit } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { queueEmail } from '@/lib/notify';
import { passwordResetEmail } from '@/lib/email-templates';

const schema = z.object({ email: z.string().email().max(120) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`forgot:${ip}`, 3, 15 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const db = getDb();
  const res = await db.query('SELECT id, name, email FROM users WHERE email = $1', [parsed.data.email.toLowerCase()]);
  const user = res.rows[0] as unknown as { id: string; name: string; email: string } | undefined;

  // Always respond ok → prevents account enumeration.
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const base = process.env.APP_BASE_URL ?? req.nextUrl.origin;
    const link = `${base}/reset-password?token=${token}`;
    await queueEmail({
      toEmail: user.email,
      subject: 'TradeNode VPS — password reset',
      body: `Open this single-use link within 60 minutes:\n${link}`,
      htmlBody: passwordResetEmail(link, 'en'),
      relatedType: 'user',
      relatedId: user.id,
    });
    await writeAudit({ actorId: user.id, actorRole: 'customer', action: 'password_reset_requested', entityType: 'user', entityId: user.id, ip });
  }
  return NextResponse.json({ ok: true });
}
