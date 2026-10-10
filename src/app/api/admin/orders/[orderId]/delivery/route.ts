import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';
import { encryptCredential, decryptCredential } from '@/lib/crypto';
import { notifyUser } from '@/lib/notify';
import { vpsReadyEmail } from '@/lib/email-templates';

const schema = z.object({
  hostname: z.string().max(200).optional().nullable(),
  ip: z.string().max(80).optional().nullable(),
  rdpPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  username: z.string().max(80).optional().nullable(),
  password: z.string().max(200).optional().nullable(),          // encrypted at rest
  passwordHint: z.string().max(200).optional().nullable(),
  os: z.string().max(120).optional().nullable(),
  specs: z.string().max(500).optional().nullable(),
  provisioningDate: z.string().max(40).optional().nullable(),
  startDate: z.string().max(40).optional().nullable(),
  expirationDate: z.string().max(40).optional().nullable(),
  setupInstructions: z.string().max(4000).optional().nullable(),
  privateNote: z.string().max(2000).optional().nullable(),
  sendToCustomer: z.boolean().optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { orderId } = await ctx.params;

  const db = getDb();
  const vRes = await db.query('SELECT * FROM vps_instances WHERE order_id = $1', [orderId]);
  const v = vRes.rows[0] as Record<string, unknown> | undefined;
  if (!v) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Auditing credential access is a hard requirement.
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'credential_viewed', entityType: 'vps_instance', entityId: v.id as string });

  let plainPassword: string | null = null;
  if (v.password_encrypted) {
    try { plainPassword = decryptCredential(v.password_encrypted as string); } catch { plainPassword = null; }
  }
  return NextResponse.json({ instance: { ...v, password_encrypted: undefined, password: plainPassword } });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { orderId } = await ctx.params;
  const ip: string | null = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const d = parsed.data;

  const db = getDb();
  const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = orderRes.rows[0] as Record<string, unknown> | undefined;
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!['payment_approved', 'awaiting_vps', 'vps_provisioning', 'active'].includes(String(order.status))) {
    return NextResponse.json({ error: 'invalid_order_state' }, { status: 400 });
  }

  const existingRes = await db.query('SELECT id FROM vps_instances WHERE order_id = $1', [orderId]);
  const existing = existingRes.rows[0] as { id: string } | undefined;
  const vpsId = existing?.id ?? newId('vps');
  if (!existing) await db.query(`INSERT INTO vps_instances (id, order_id, status) VALUES ($1, $2, 'pending')`, [vpsId, orderId]);

  const passwordEnc = d.password ? encryptCredential(d.password) : null;
  const now = new Date().toISOString();
  const send = d.sendToCustomer === true;

  await db.query(
    `UPDATE vps_instances SET
       hostname = COALESCE($1, hostname), ip = COALESCE($2, ip), rdp_port = COALESCE($3, rdp_port),
       username = COALESCE($4, username),
       password_encrypted = COALESCE($5, password_encrypted), password_hint = COALESCE($6, password_hint),
       os = COALESCE($7, os), specs = COALESCE($8, specs),
       provisioning_date = COALESCE($9, provisioning_date), start_date = COALESCE($10, start_date),
       expiration_date = COALESCE($11, expiration_date),
       setup_instructions = COALESCE($12, setup_instructions), private_note = COALESCE($13, private_note),
       status = CASE WHEN $14 THEN 'ready' ELSE status END,
       sent_to_customer = CASE WHEN $14 THEN true ELSE sent_to_customer END,
       sent_at = CASE WHEN $14 THEN $15 ELSE sent_at END
     WHERE id = $16`,
    [
      d.hostname ?? null, d.ip ?? null, d.rdpPort ?? null, d.username ?? null,
      passwordEnc, d.passwordHint ?? null,
      d.os ?? null, d.specs ?? null,
      d.provisioningDate ?? null, d.startDate ?? null, d.expirationDate ?? null,
      d.setupInstructions ?? null, d.privateNote ?? null,
      send, send ? now : null, vpsId,
    ]
  );

  if (send) {
    await db.query(`UPDATE orders SET status = 'active', updated_at = $1 WHERE id = $2`, [now, orderId]);
    await db.query(`UPDATE subscriptions SET status = 'active', updated_at = $1 WHERE order_id = $2`, [now, orderId]);

    const customerRes = await db.query('SELECT id, email FROM users WHERE id = $1', [order.user_id]);
    const customer = customerRes.rows[0] as { id: string; email: string };
    await notifyUser({
      userId: customer.id, type: 'vps_ready', payload: { orderNumber: order.order_number },
      emailSubject: 'TradeNode VPS — your VPS is ready',
      emailBody: `Your VPS for order ${order.order_number} is ready. Log in to the dashboard to see connection details.`,
      emailHtml: vpsReadyEmail(order.order_number as string, (d.hostname as string) ?? (d.ip as string) ?? 'your server', 'en'),
      toEmail: customer.email,
    });
    await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'vps_delivered', entityType: 'order', entityId: orderId, ip });
  } else {
    await db.query(`UPDATE orders SET status = 'vps_provisioning', updated_at = $1 WHERE id = $2`, [now, orderId]);
    await db.query(`UPDATE vps_instances SET status = 'provisioning' WHERE order_id = $1`, [orderId]);
    await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'vps_provision_saved', entityType: 'order', entityId: orderId, ip });
  }

  return NextResponse.json({ ok: true, sentToCustomer: send });
}
