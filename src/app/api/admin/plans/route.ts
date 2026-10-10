import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';

const planSchema = z.object({
  name_en: z.string().min(1).max(80),
  name_ar: z.string().min(1).max(80),
  tagline_en: z.string().max(200).optional().nullable(),
  tagline_ar: z.string().max(200).optional().nullable(),
  cpu: z.string().min(1).max(60),
  ram: z.string().min(1).max(60),
  storage: z.string().min(1).max(60),
  bandwidth: z.string().max(60).optional().nullable(),
  monthly_price: z.number().min(0).max(100000),
  billing_periods: z.string().max(200),
  billing_discount_quarterly: z.number().min(0).max(0.9).optional().nullable(),
  billing_discount_semiannual: z.number().min(0).max(0.9).optional().nullable(),
  billing_discount_annual: z.number().min(0).max(0.9).optional().nullable(),
  os: z.string().max(200),
  capacity_title_en: z.string().max(200).optional().nullable(),
  capacity_title_ar: z.string().max(200).optional().nullable(),
  best_for_en: z.string().max(300).optional().nullable(),
  best_for_ar: z.string().max(300).optional().nullable(),
  is_active: z.boolean().optional(),
  is_soldout: z.boolean().optional(),
  featured: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'plan';
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const res = await getDb().query('SELECT * FROM plans ORDER BY sort_order ASC');
  return NextResponse.json({ plans: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = planSchema.extend({ duplicateOf: z.string().optional().nullable() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const d = parsed.data;

  const db = getDb();
  const id = newId('pl');
  const now = new Date().toISOString();

  if (d.duplicateOf) {
    const srcRes = await db.query('SELECT * FROM plans WHERE id = $1', [d.duplicateOf]);
    const src = srcRes.rows[0] as Record<string, unknown> | undefined;
    if (!src) return NextResponse.json({ error: 'source_not_found' }, { status: 404 });
    const slug = `${String(src.slug)}-copy-${Date.now().toString(36)}`;
    const copy: Record<string, unknown> = { ...src, id, slug, name_en: `${d.name_en} (copy)`, name_ar: `${d.name_ar} (نسخة)`, is_active: false, featured: false, sort_order: 200, created_at: now, updated_at: now };
    const cols = Object.keys(copy);
    const ph = cols.map((_, i) => `$${i + 1}`).join(',');
    await db.query(`INSERT INTO plans (${cols.join(',')}) VALUES (${ph})`, cols.map((k) => copy[k]));
    await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'plan_duplicated', entityType: 'plan', entityId: id, details: { fromPlan: d.duplicateOf } });
    return NextResponse.json({ ok: true, id, slug }, { status: 201 });
  }

  let slug = slugify(d.name_en);
  const slugTaken = await db.query('SELECT 1 FROM plans WHERE slug = $1', [slug]);
  if (slugTaken.rows.length > 0) slug = `${slug}-${Date.now().toString(36)}`;

  await db.query(
    `INSERT INTO plans (id, slug, name_en, name_ar, tagline_en, tagline_ar, cpu, ram, storage, bandwidth, monthly_price,
       billing_periods, billing_discount_quarterly, billing_discount_semiannual, billing_discount_annual, os,
       capacity_title_en, capacity_title_ar, best_for_en, best_for_ar, is_active, is_soldout, featured, sort_order, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,false,$22,$23,$24,$25)`,
    [
      id, slug, d.name_en, d.name_ar, d.tagline_en ?? null, d.tagline_ar ?? null, d.cpu, d.ram, d.storage,
      d.bandwidth ?? 'Unmetered*', d.monthly_price, d.billing_periods,
      d.billing_discount_quarterly ?? 0, d.billing_discount_semiannual ?? 0, d.billing_discount_annual ?? 0,
      d.os, d.capacity_title_en ?? null, d.capacity_title_ar ?? null, d.best_for_en ?? null, d.best_for_ar ?? null,
      d.is_active ?? false, d.featured ?? false, d.sort_order ?? 200, now, now,
    ]
  );
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'plan_created', entityType: 'plan', entityId: id, details: { name: d.name_en, price: d.monthly_price } });
  return NextResponse.json({ ok: true, id, slug }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body?.id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  const parsed = planSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const d = parsed.data;

  const db = getDb();
  const existing = await db.query('SELECT id FROM plans WHERE id = $1', [body.id as string]);
  if (existing.rows.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const sets: string[] = [];
  const params: unknown[] = [];
  const map: Record<string, unknown> = { ...d };
  for (const [k, v] of Object.entries(map)) {
    if (v === undefined) continue;
    sets.push(`${k} = $${params.length + 1}`); params.push(v);
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  sets.push(`updated_at = $${params.length + 1}`); params.push(new Date().toISOString());
  params.push(body.id as string);
  await db.query(`UPDATE plans SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'plan_updated', entityType: 'plan', entityId: body.id as string, details: d });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  const db = getDb();
  const used = await db.query('SELECT 1 FROM orders WHERE plan_id = $1 LIMIT 1', [id]);
  if (used.rows.length > 0) {
    await db.query('UPDATE plans SET is_active = false, is_soldout = true, updated_at = $1 WHERE id = $2', [new Date().toISOString(), id]);
    await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'plan_disabled_instead_of_delete', entityType: 'plan', entityId: id });
    return NextResponse.json({ ok: true, note: 'Plan has orders — it was disabled instead of deleted.' });
  }
  await db.query('DELETE FROM plans WHERE id = $1', [id]);
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'plan_deleted', entityType: 'plan', entityId: id });
  return NextResponse.json({ ok: true });
}
