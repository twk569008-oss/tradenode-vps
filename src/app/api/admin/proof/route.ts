import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { writeAudit } from '@/lib/auth';
import { getObject } from '@/lib/storage';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const submissionId = req.nextUrl.searchParams.get('submissionId');
  if (!submissionId || !/^[a-zA-Z0-9_-]{10,64}$/.test(submissionId)) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const db = getDb();
  const subRes = await db.query('SELECT screenshot_storage_key, screenshot_mime, order_id FROM payment_submissions WHERE id = $1', [submissionId]);
  const sub = subRes.rows[0] as { screenshot_storage_key: string; screenshot_mime: string; order_id: string } | undefined;
  if (!sub || !sub.screenshot_storage_key) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'proof_viewed', entityType: 'submission', entityId: submissionId, details: { orderId: sub.order_id } });

  if (!/^[a-zA-Z0-9_-]+\.\w+$/.test(sub.screenshot_storage_key)) return NextResponse.json({ error: 'invalid_key' }, { status: 400 });
  const buf = await getObject(sub.screenshot_storage_key);
  if (!buf) return NextResponse.json({ error: 'file_missing' }, { status: 404 });
  return new NextResponse(new Uint8Array(buf), { headers: { 'Content-Type': sub.screenshot_mime, 'Cache-Control': 'private, no-store' } });
}
