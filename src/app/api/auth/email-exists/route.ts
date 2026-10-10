import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`exists:${ip}`, 15, 5 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  const res = await getDb().query('SELECT 1 FROM users WHERE email = $1', [email]);
  return NextResponse.json({ exists: res.rows.length > 0 });
}
