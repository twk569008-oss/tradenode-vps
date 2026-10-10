import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { verifyPassword, createSession, writeAudit, SESSION_COOKIE } from '@/lib/auth';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

const schema = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(128) });

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`login:${ip}`, 10, 10 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'rate_limited', retryAfterMs: rl.retryAfterMs }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { email, password } = parsed.data;

  const db = getDb();
  const res = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = res.rows[0] as unknown as
    | { id: string; name: string; email: string; password_hash: string; role: string; locale: string; theme: string; is_active: boolean; suspended_at: string | null }
    | undefined;

  // Uniform failure: never reveal whether the email exists.
  const ok = user && user.is_active && (await verifyPassword(password, user.password_hash));
  if (!ok || !user) {
    await writeAudit({ actorId: user?.id ?? null, actorRole: 'customer', action: 'login_failed', entityType: 'user', entityId: user?.id ?? email, details: { ip }, ip });
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }
  if (user.suspended_at) {
    return NextResponse.json({ error: 'account_suspended' }, { status: 403 });
  }

  resetRateLimit(`login:${ip}`);
  const token = await createSession(user.id, ip, req.headers.get('user-agent'));
  await db.query('UPDATE users SET last_login_at = $1 WHERE id = $2', [new Date().toISOString(), user.id]);
  await writeAudit({ actorId: user.id, actorRole: user.role === 'admin' ? 'admin' : 'customer', action: 'login_success', entityType: 'user', entityId: user.id, ip });

  const out = NextResponse.json({
    ok: true, role: user.role, redirect: user.role === 'admin' ? '/admin' : '/dashboard',
  });
  out.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 3600 * 24 * 15,
  });
  return out;
}
