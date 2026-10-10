import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { hashPassword, newId, createSession, passwordMeetsPolicy, writeAudit, SESSION_COOKIE } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { queueEmail } from '@/lib/notify';
import { welcomeEmail } from '@/lib/email-templates';

const schema = z.object({
  name: z.string().trim().min(3, 'Username must be at least 3 characters').max(32, 'Username too long')
    .regex(/^[\w.-]+$/, 'USERNAME_RULE'), // letters, digits, dot, underscore, dash
  email: z.string().email('Invalid email').max(120),
  password: z.string().min(10, 'Use 10+ characters with uppercase, lowercase, number and symbol').max(128),
  locale: z.enum(['en', 'ar']).default('en'),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`register:${ip}`, 5, 15 * 60_000).allowed) {
    return NextResponse.json({ error: 'rate_limited', retryAfterMs: 60_000 }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, email, password, locale } = parsed.data;
  if (!passwordMeetsPolicy(password)) {
    return NextResponse.json({ error: 'weak_password', hint: 'Use 10+ characters incl. uppercase, lowercase, number and symbol.' }, { status: 400 });
  }

  const db = getDb();
  const emailLower = email.toLowerCase();

  const existsEmail = await db.query('SELECT id FROM users WHERE email = $1', [emailLower]);
  if (existsEmail.rows.length > 0) {
    return NextResponse.json(
      { code: 'email_in_use', message: 'This email is already registered.', suggestion: 'login' },
      { status: 409 }
    );
  }
  const existsUser = await db.query('SELECT id FROM users WHERE lower(name) = lower($1)', [name]);
  if (existsUser.rows.length > 0) {
    return NextResponse.json(
      { code: 'username_taken', message: 'That username is taken. Try another.' },
      { status: 409 }
    );
  }

  const id = newId('usr');
  const now = new Date().toISOString();
  const hash = await hashPassword(password);
  await db.query(
    `INSERT INTO users (id, name, email, password_hash, locale, role, theme, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'customer', 'dark', true, $6, $7)`,
    [id, name, emailLower, hash, locale, now, now]
  );

  await writeAudit({ actorId: id, actorRole: 'customer', action: 'account_created', entityType: 'user', entityId: id, ip });

  // Premium branded welcome email (queued; sent instantly if SMTP configured).
  const baseUrl = process.env.APP_BASE_URL ?? req.nextUrl.origin;
  void baseUrl;
  await queueEmail({
    toEmail: emailLower,
    subject: locale === 'ar' ? '🎉 أهلاً بك في TradeNode VPS — تم إنشاء حسابك بنجاح' : '🎉 Welcome to TradeNode VPS — your account is ready',
    body: locale === 'ar'
      ? `تم إنشاء حسابك بنجاح. البريد: ${emailLower}. الخطط تبدأ من $2/شهر مع خصومات سنوية تصل إلى 18%.`
      : `Your account has been created successfully. Login: ${emailLower}. Plans from $2/month with up to 18% annual discount.`,
    htmlBody: welcomeEmail(name, emailLower, locale),
    relatedType: 'user',
    relatedId: id,
  });

  const token = await createSession(id, ip, req.headers.get('user-agent'));
  const res = NextResponse.json({ ok: true, userId: id, redirect: '/dashboard' }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 3600 * 24 * 15,
  });
  return res;
}
