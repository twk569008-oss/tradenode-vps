import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { consumePasswordResetToken, hashPassword, passwordMeetsPolicy, revokeAllUserSessions, writeAudit } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({ token: z.string().min(10).max(200), password: z.string().min(10).max(128) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`reset:${ip}`, 5, 15 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  if (!passwordMeetsPolicy(parsed.data.password)) {
    return NextResponse.json({ error: 'weak_password', hint: 'Use 10+ chars incl. upper, lower, digit, symbol.' }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) return NextResponse.json({ error: 'invalid_or_expired_token' }, { status: 400 });

  const db = getDb();
  await db.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
    await hashPassword(parsed.data.password), new Date().toISOString(), userId,
  ]);
  await revokeAllUserSessions(userId);
  await writeAudit({ actorId: userId, actorRole: 'customer', action: 'password_reset_completed', entityType: 'user', entityId: userId, ip });
  return NextResponse.json({ ok: true });
}
