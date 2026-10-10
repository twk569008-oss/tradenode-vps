import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { getObject } from '@/lib/storage';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ submissionId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const { submissionId } = await ctx.params;
  const db = getDb();
  const subRes = await db.query(
    `SELECT ps.screenshot_storage_key, ps.screenshot_mime, o.user_id
     FROM payment_submissions ps JOIN orders o ON o.id = ps.order_id
     WHERE ps.id = $1`,
    [submissionId]
  );
  const sub = subRes.rows[0] as { screenshot_storage_key: string; screenshot_mime: string; user_id: string } | undefined;

  if (!sub || sub.user_id !== user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Defense-in-depth: the DB key must be a bare filename, no path parts.
  if (!/^[a-zA-Z0-9_-]+\.\w+$/.test(sub.screenshot_storage_key)) return NextResponse.json({ error: 'invalid_key' }, { status: 400 });

  const buf = await getObject(sub.screenshot_storage_key);
  if (!buf) return NextResponse.json({ error: 'file_missing' }, { status: 404 });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': sub.screenshot_mime,
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline',
    },
  });
}
