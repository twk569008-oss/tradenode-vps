import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';
import { notifyUser } from '@/lib/notify';
import { paymentApprovedEmail, paymentRejectedEmail, vpsReadyEmail } from '@/lib/email-templates';

const deliverySchema = z.object({
  vpsHost: z.string().trim().min(1).max(200),
  vpsPort: z.number().int().min(1).max(65535).optional(),
  vpsUsername: z.string().trim().min(1).max(100),
  vpsPassword: z.string().trim().max(200).optional(),
  vpsOs: z.string().trim().max(60).optional(),
  setupNote: z.string().max(2000).optional(),
});

const actionSchema = z.object({
  action: z.enum(['approve_payment', 'reject_payment', 'reject_submission', 'cancel_order', 'mark_awaiting_vps', 'mark_provisioning', 'mark_active', 'approve_and_deliver']),
  submissionId: z.string().max(64).optional(),
  reason: z.string().max(500).optional(),
  adminNote: z.string().max(2000).optional(),
  delivery: deliverySchema.optional(),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { orderId } = await ctx.params;
  const db = getDb();

  const orderRes = await db.query(
    `SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.id AS customer_id,
            p.name_en AS plan_name, p.cpu, p.ram, p.storage
     FROM orders o JOIN users u ON u.id = o.user_id JOIN plans p ON p.id = o.plan_id
     WHERE o.id = $1`,
    [orderId]
  );
  const order = orderRes.rows[0] as Record<string, unknown> | undefined;
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const [submissions, instance, subscription] = await Promise.all([
    db.query(`SELECT * FROM payment_submissions WHERE order_id = $1 ORDER BY submitted_at DESC`, [orderId]),
    db.query(`SELECT * FROM vps_instances WHERE order_id = $1`, [orderId]),
    db.query(`SELECT * FROM subscriptions WHERE order_id = $1`, [orderId]),
  ]);

  return NextResponse.json({
    order,
    submissions: submissions.rows,
    instance: instance.rows[0] ?? null,
    subscription: subscription.rows[0] ?? null,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ orderId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { orderId } = await ctx.params;

  const parsed = actionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { action, submissionId, reason, adminNote } = parsed.data;

  const db = getDb();
  const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = orderRes.rows[0] as Record<string, unknown> | undefined;
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const now = new Date().toISOString();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';
  const PERIOD_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
  const periodMonthsOf = (label: string): number => {
    const m = label.match(/^custom_(\d+)m$/);
    if (m) { const n = parseInt(m[1], 10); return n >= 2 && n <= 36 ? n : 1; }
    return PERIOD_MONTHS[label] ?? 1;
  };

  switch (action) {
    case 'approve_payment': {
      const subRes = submissionId
        ? await db.query('SELECT * FROM payment_submissions WHERE id = $1 AND order_id = $2', [submissionId, orderId])
        : await db.query(`SELECT * FROM payment_submissions WHERE order_id = $1 AND status = 'pending' ORDER BY submitted_at DESC LIMIT 1`, [orderId]);
      const sub = subRes.rows[0] as Record<string, unknown> | undefined;
      if (!sub) return NextResponse.json({ error: 'no_pending_submission' }, { status: 400 });

      await db.query(`UPDATE payment_submissions SET status = 'approved', reviewed_at = $1, reviewer_id = $2 WHERE id = $3`, [now, user.id, sub.id as string]);
      await db.query(`UPDATE payment_submissions SET status = 'rejected', reviewed_at = $1, reviewer_id = $2, reviewer_note = 'superseded by newer submission' WHERE order_id = $3 AND id != $4 AND status = 'pending'`, [now, user.id, orderId, sub.id as string]);
      await db.query(`UPDATE orders SET status = 'payment_approved', updated_at = $1 WHERE id = $2`, [now, orderId]);
      await db.query(`UPDATE orders SET admin_notes = $1 WHERE id = $2`, [adminNote ?? (order.admin_notes as string | null), orderId]);

      // Create VPS placeholder + subscription skeleton (marks ready only when admin fills delivery).
      const vpsId = newId('vps');
      await db.query(`INSERT INTO vps_instances (id, order_id, status) VALUES ($1, $2, 'pending') ON CONFLICT (order_id) DO NOTHING`, [vpsId, orderId]);
      const start = now;
      const months = periodMonthsOf(String(order.billing_period));
      const end = new Date(new Date(start).setMonth(new Date(start).getMonth() + months)).toISOString();
      const vpsRow = await db.query('SELECT id FROM vps_instances WHERE order_id = $1', [orderId]);
      const realVpsId = (vpsRow.rows[0] as { id: string }).id;
      await db.query(
        `INSERT INTO subscriptions (id, order_id, vps_id, start_date, end_date, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7) ON CONFLICT (order_id) DO NOTHING`,
        [newId('sub'), orderId, realVpsId, start, end, now, now]
      );

      const customerRes = await db.query('SELECT id, email FROM users WHERE id = $1', [order.user_id]);
      const customer = customerRes.rows[0] as { id: string; email: string };
      await notifyUser({
        userId: customer.id, type: 'payment_approved', payload: { orderNumber: order.order_number },
        emailSubject: 'TradeNode VPS — payment approved',
        emailBody: `Payment for order ${order.order_number} is approved. The VPS is being prepared.`,
        emailHtml: paymentApprovedEmail(order.order_number as string, `$${Number(order.price).toFixed(2)}`, 'en'),
        toEmail: customer.email,
      });

      // Referral commission: 20% of verified order value to the referring user.
      const refRes = await db.query(`SELECT referred_by FROM users WHERE id = $1 AND referred_by IS NOT NULL`, [order.user_id]);
      const refId = (refRes.rows[0] as { referred_by?: string } | undefined)?.referred_by;
      if (refId) {
        const amount = Number(order.price) * 0.20;
        await db.query(
          `INSERT INTO referral_earnings (id, earner_user_id, buyer_user_id, order_number, amount, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [newId('ref'), refId, order.user_id, order.order_number, amount, now]
        );
        await db.query(
          `UPDATE users SET referral_balance = COALESCE(referral_balance, 0) + $1 WHERE id = $2`,
          [amount, refId]
        );
      }

      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'payment_approved', entityType: 'order', entityId: orderId, details: { submissionId: sub.id }, ip });
      break;
    }
    case 'reject_payment': {
      const subRes = submissionId
        ? await db.query('SELECT * FROM payment_submissions WHERE id = $1 AND order_id = $2', [submissionId, orderId])
        : await db.query(`SELECT * FROM payment_submissions WHERE order_id = $1 AND status = 'pending' ORDER BY submitted_at DESC LIMIT 1`, [orderId]);
      const sub = subRes.rows[0] as Record<string, unknown> | undefined;
      if (!sub) return NextResponse.json({ error: 'no_pending_submission' }, { status: 400 });
      await db.query(`UPDATE payment_submissions SET status = 'rejected', reviewed_at = $1, reviewer_id = $2, reviewer_note = $3 WHERE id = $4`, [now, user.id, reason ?? null, sub.id as string]);
      await db.query(`UPDATE orders SET status = 'payment_rejected', rejection_reason = $1, updated_at = $2 WHERE id = $3`, [reason ?? null, now, orderId]);

      const customerRes = await db.query('SELECT id, email FROM users WHERE id = $1', [order.user_id]);
      const customer = customerRes.rows[0] as { id: string; email: string };
      await notifyUser({
        userId: customer.id, type: 'payment_rejected', payload: { orderNumber: order.order_number, reason: reason ?? null },
        emailSubject: 'TradeNode VPS — payment rejected',
        emailBody: `Payment for order ${order.order_number} was rejected. Reason: ${reason ?? 'not stated'}.`,
        emailHtml: paymentRejectedEmail(order.order_number as string, reason ?? 'No reason recorded.', 'en'),
        toEmail: customer.email,
      });

      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'payment_rejected', entityType: 'order', entityId: orderId, details: { submissionId: sub.id, reason }, ip });
      break;
    }
    case 'reject_submission': {
      if (!submissionId) return NextResponse.json({ error: 'submission_required' }, { status: 400 });
      await db.query(`UPDATE payment_submissions SET status = 'rejected', reviewed_at = $1, reviewer_id = $2, reviewer_note = $3 WHERE id = $4 AND order_id = $5`, [now, user.id, reason ?? null, submissionId, orderId]);
      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'submission_rejected', entityType: 'submission', entityId: submissionId, details: { reason }, ip });
      break;
    }
    case 'cancel_order': {
      await db.query(`UPDATE orders SET status = 'cancelled', rejection_reason = $1, updated_at = $2 WHERE id = $3`, [reason ?? null, now, orderId]);
      await db.query(`UPDATE subscriptions SET status = 'cancelled', updated_at = $1 WHERE order_id = $2`, [now, orderId]);
      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'order_cancelled', entityType: 'order', entityId: orderId, details: { reason }, ip });
      break;
    }
    case 'mark_awaiting_vps': {
      await db.query(`UPDATE orders SET status = 'awaiting_vps', updated_at = $1 WHERE id = $2`, [now, orderId]);
      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'order_marked_awaiting_vps', entityType: 'order', entityId: orderId, ip });
      break;
    }
    case 'mark_provisioning': {
      await db.query(`UPDATE orders SET status = 'vps_provisioning', updated_at = $1 WHERE id = $2`, [now, orderId]);
      await db.query(`UPDATE vps_instances SET status = 'provisioning' WHERE order_id = $1`, [orderId]);
      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'order_marked_provisioning', entityType: 'order', entityId: orderId, ip });
      break;
    }
    case 'mark_active': {
      await db.query(`UPDATE orders SET status = 'active', updated_at = $1 WHERE id = $2`, [now, orderId]);
      await db.query(`UPDATE vps_instances SET status = 'active' WHERE order_id = $1`, [orderId]);
      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'order_marked_active', entityType: 'order', entityId: orderId, ip });
      break;
    }
    case 'approve_and_deliver': {
      // One-step flow: verify the pending payment AND fill+send VPS delivery details.
      const d = parsed.data.delivery;
      if (!d) return NextResponse.json({ error: 'delivery_required' }, { status: 400 });

      // 1) Approve pending submission + order + subscription skeleton
      const subRes2 = submissionId
        ? await db.query('SELECT * FROM payment_submissions WHERE id = $1 AND order_id = $2', [submissionId, orderId])
        : await db.query(`SELECT * FROM payment_submissions WHERE order_id = $1 AND status = 'pending' ORDER BY submitted_at DESC LIMIT 1`, [orderId]);
      const sub2 = subRes2.rows[0] as Record<string, unknown> | undefined;
      if (sub2) {
        await db.query(`UPDATE payment_submissions SET status = 'approved', reviewed_at = $1, reviewer_id = $2 WHERE id = $3`, [now, user.id, sub2.id as string]);
        await db.query(`UPDATE payment_submissions SET status = 'rejected', reviewed_at = $1, reviewer_id = $2 WHERE order_id = $3 AND id != $4 AND status = 'pending'`, [now, user.id, orderId, sub2.id as string]);
      }
      await db.query(`UPDATE orders SET status = 'active', admin_notes = $1, updated_at = $2 WHERE id = $3`, [adminNote ?? (order.admin_notes as string | null), now, orderId]);

      // 2) Fill VPS instance (or update if exists) + activate subscription
      const vpsRes = await db.query('SELECT id FROM vps_instances WHERE order_id = $1', [orderId]);
      let vpsId: string;
      if (vpsRes.rows.length > 0) {
        vpsId = (vpsRes.rows[0] as { id: string }).id;
        await db.query(
          `UPDATE vps_instances SET hostname = $1, rdp_port = $2, username = $3, password_encrypted = $4, os = $5, status = 'active', provisioned_at = $6 WHERE id = $7`,
          [d.vpsHost, d.vpsPort ?? 3389, d.vpsUsername, d.vpsPassword ?? null, d.vpsOs ?? 'Windows Server', now, vpsId]
        );
      } else {
        vpsId = newId('vps');
        await db.query(
          `INSERT INTO vps_instances (id, order_id, hostname, rdp_port, username, password_encrypted, os, status, provisioned_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8)`,
          [vpsId, orderId, d.vpsHost, d.vpsPort ?? 3389, d.vpsUsername, d.vpsPassword ?? null, d.vpsOs ?? 'Windows Server', now]
        );
      }

      const months2 = periodMonthsOf(String(order.billing_period));
      const end2 = new Date(new Date(now).setMonth(new Date(now).getMonth() + months2)).toISOString();
      const subEx = await db.query('SELECT id FROM subscriptions WHERE order_id = $1', [orderId]);
      if (subEx.rows.length > 0) {
        const subId = (subEx.rows[0] as { id: string }).id;
        await db.query(`UPDATE subscriptions SET vps_id = $1, start_date = $2, end_date = $3, status = 'active', updated_at = $2 WHERE id = $4`, [vpsId, now, end2, subId]);
      } else {
        await db.query(
          `INSERT INTO subscriptions (id, order_id, vps_id, start_date, end_date, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)`,
          [newId('sub'), orderId, vpsId, now, end2, now, now]
        );
      }

      // 3) Referral commission
      const refRes2 = await db.query(`SELECT referred_by FROM users WHERE id = $1 AND referred_by IS NOT NULL`, [order.user_id]);
      const refId2 = (refRes2.rows[0] as { referred_by?: string } | undefined)?.referred_by;
      if (refId2) {
        const amount2 = Number(order.price) * 0.20;
        await db.query(
          `INSERT INTO referral_earnings (id, earner_user_id, buyer_user_id, order_number, amount, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
          [newId('ref'), refId2, order.user_id, order.order_number, amount2, now]
        );
        await db.query(`UPDATE users SET referral_balance = COALESCE(referral_balance,0) + $1 WHERE id = $2`, [amount2, refId2]);
      }

      // 4) Notify customer (dashboard + email)
      const customerRes2 = await db.query('SELECT id, email FROM users WHERE id = $1', [order.user_id]);
      const customer2 = customerRes2.rows[0] as { id: string; email: string };
      await notifyUser({
        userId: customer2.id, type: 'vps_ready', payload: { orderNumber: order.order_number, host: d.vpsHost },
        emailSubject: 'TradeNode VPS — your VPS is ready',
        emailBody: `Your VPS for order ${order.order_number} is live. Connection details in your dashboard.`,
        emailHtml: vpsReadyEmail(order.order_number as string, d.vpsHost, 'en'),
        toEmail: customer2.email,
      });

      await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'order_approved_and_delivered', entityType: 'order', entityId: orderId, details: { host: d.vpsHost }, ip });
      break;
    }
  }
  return NextResponse.json({ ok: true });
}
