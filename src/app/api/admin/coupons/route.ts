import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';

const createSchema = z.object({
  code: z.string().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.number().min(0.01).max(100000),
  max_uses: z.number().int().min(1).max(100000).optional().nullable(),
  expires_at: z.string().max(40).optional().nullable(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const res = await getDb().query('SELECT * FROM coupons ORDER BY created_at DESC');
  return NextResponse.json({ coupons: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const d = parsed.data;

  const db = getDb();
  const existsRes = await db.query('SELECT 1 FROM coupons WHERE lower(code) = lower($1)', [d.code]);
  if (existsRes.rows.length > 0) return NextResponse.json({ error: 'code_exists' }, { status: 409 });

  const id = newId('c');
  await db.query(
    `INSERT INTO coupons (id, code, discount_type, discount_value, max_uses, expires_at, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, true, $7)`,
    [id, d.code.toUpperCase(), d.discount_type, d.discount_value, d.max_uses ?? null, d.expires_at ?? null, new Date().toISOString()]
  );
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'coupon_created', entityType: 'coupon', entityId: id, details: { code: d.code, type: d.discount_type, value: d.discount_value } });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null) as { id?: string; isActive?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  await getDb().query('UPDATE coupons SET is_active = $1 WHERE id = $2', [Boolean(body.isActive), body.id]);
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'coupon_toggled', entityType: 'coupon', entityId: body.id, details: { active: body.isActive } });
  return NextResponse.json({ ok: true });
}
