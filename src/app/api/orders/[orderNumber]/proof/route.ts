import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';
import { validateUpload } from '@/lib/file-upload';
import { putObject } from '@/lib/storage';
import { checkRateLimit } from '@/lib/rate-limit';

const MAX_BYTES = () => Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024);

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  if (!checkRateLimit(`proof:${user.id}`, 6, 10 * 60_000).allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const { orderNumber } = await ctx.params;
  const db = getDb();
  const orderRes = await db.query('SELECT * FROM orders WHERE order_number = $1 AND user_id = $2', [orderNumber, user.id]);
  const order = orderRes.rows[0] as Record<string, unknown> | undefined;
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });

  const network = String(form.get('network') ?? '').trim();
  const txHash = String(form.get('txHash') ?? '').trim();
  const file = form.get('screenshot');

  if (!network) return NextResponse.json({ error: 'network_required' }, { status: 400 });
  if (txHash && !/^[a-zA-Z0-9]{16,120}$/.test(txHash)) return NextResponse.json({ error: 'invalid_tx_hash' }, { status: 400 });

  const netRes = await db.query('SELECT 1 FROM payment_networks WHERE code = $1 AND is_active = true', [network]);
  if (netRes.rows.length === 0) return NextResponse.json({ error: 'network_unknown' }, { status: 400 });

  let storageKey: string | null = null;
  let mime: string | null = null;
  let size: number | null = null;

  if (file && file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const v = validateUpload(buf, file.type, file.name, MAX_BYTES());
    if (!v.ok) {
      const msgs: Record<string, string> = {
        file_too_large: 'File exceeds the size limit.',
        unsupported_file_type: 'Only PNG, JPG, WEBP images or PDF accepted.',
        executable_forbidden: 'Executable files are forbidden.',
        declared_mime_rejected: 'File type rejected.',
        file_empty: 'Empty file.',
      };
      return NextResponse.json({ error: msgs[v.error] ?? 'upload_failed' }, { status: 400 });
    }
    try {
      const stored = await putObject(buf, v.mime, newId('pf'));
      storageKey = stored.key; mime = stored.mime; size = stored.size;
    } catch (e) {
      console.error('[proof] storage write failed:', e instanceof Error ? e.message : e);
      return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
    }
  }

  if (!storageKey && !txHash) {
    return NextResponse.json({ error: 'proof_required', note: 'Provide a screenshot and/or transaction hash.' }, { status: 400 });
  }

  const id = newId('psub');
  const orderIdStr = order.id as string;
  await db.query(
    `INSERT INTO payment_submissions (id, order_id, network_code, transaction_hash, amount_crypto, amount_usd, screenshot_storage_key, screenshot_mime, screenshot_size, submitted_at, status)
     VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, 'pending')`,
    [id, orderIdStr, network, txHash || null, Number(order.price), storageKey, mime, size, new Date().toISOString()]
  );

  await db.query(`UPDATE orders SET status = 'under_review', payment_network = $1, updated_at = $2 WHERE id = $3`, [network, new Date().toISOString(), orderIdStr]);

  await writeAudit({ actorId: user.id, actorRole: 'customer', action: 'payment_proof_submitted', entityType: 'order', entityId: orderIdStr, details: { network, hasScreenshot: !!storageKey, hasHash: !!txHash }, ip: req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown' });
  return NextResponse.json({ ok: true, submissionId: id }, { status: 201 });
}
