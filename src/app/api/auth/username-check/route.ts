import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { checkRateLimit } from '@/lib/rate-limit';

const USERNAME_RE = /^[\w.-]{3,32}$/;
const RESERVED = new Set(['admin', 'administrator', 'support', 'root', 'system', 'moderator', 'tradenode', 'staff', 'help', 'security', 'api'].filter(Boolean));

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(`uname:${ip}`, 20, 5 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const username = req.nextUrl.searchParams.get('username')?.trim() ?? '';
  if (!USERNAME_RE.test(username)) return NextResponse.json({ available: false, reason: 'invalid' });
  if (RESERVED.has(username.toLowerCase())) return NextResponse.json({ available: false, reason: 'reserved' });

  const res = await getDb().query('SELECT 1 FROM users WHERE lower(name) = lower($1)', [username.toLowerCase()]);
  return NextResponse.json({ available: res.rows.length === 0, reason: res.rows.length > 0 ? 'taken' : null });
}
