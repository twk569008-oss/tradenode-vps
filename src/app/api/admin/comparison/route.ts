import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { newId, writeAudit } from '@/lib/auth';

const createSchema = z.object({
  competitor_name: z.string().min(1).max(80),
  competitor_plan: z.string().min(1).max(120),
  competitor_specs: z.string().max(300).optional().nullable(),
  competitor_price: z.number().min(0).max(1_000_000),
  billing_period: z.enum(['monthly', 'quarterly', 'semiannual', 'annual']),
  source_url: z.string().url().max(400).optional().nullable(),
  our_price: z.number().min(0).max(1_000_000),
});

function pct(our: number, theirs: number): number {
  if (!theirs) return 0;
  return Math.round(((our - theirs) / theirs) * 1000) / 10;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const res = await getDb().query('SELECT * FROM pricing_comparisons ORDER BY created_at DESC');
  return NextResponse.json({ comparisons: res.rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const d = parsed.data;

  const db = getDb();
  const id = newId('cmp');
  await db.query(
    `INSERT INTO pricing_comparisons (id, competitor_name, competitor_plan, competitor_specs, competitor_price, billing_period, source_url, last_checked, our_price, pct_diff, is_public, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, $11)`,
    [id, d.competitor_name, d.competitor_plan, d.competitor_specs ?? null, d.competitor_price, d.billing_period, d.source_url ?? null, new Date().toISOString(), d.our_price, pct(d.our_price, d.competitor_price), new Date().toISOString()]
  );
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'comparison_created', entityType: 'comparison', entityId: id, details: { competitor: d.competitor_name } });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body?.id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const db = getDb();
  const existingRes = await db.query('SELECT * FROM pricing_comparisons WHERE id = $1', [body.id as string]);
  const existing = existingRes.rows[0] as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const theirs = body.competitor_price !== undefined ? Number(body.competitor_price) : Number(existing.competitor_price);
  const ours = body.our_price !== undefined ? Number(body.our_price) : Number(existing.our_price);
  const source = body.source_url !== undefined ? String(body.source_url) : existing.source_url;
  const specs = body.competitor_specs !== undefined ? String(body.competitor_specs ?? '') : existing.competitor_specs;
  const checked = body.last_checked !== undefined ? String(body.last_checked) : new Date().toISOString();
  const isPublic = body.is_public !== undefined ? Boolean(body.is_public) : Boolean(existing.is_public);

  await db.query(
    `UPDATE pricing_comparisons SET competitor_price = $1, our_price = $2, source_url = $3, competitor_specs = $4, last_checked = $5, is_public = $6, pct_diff = $7 WHERE id = $8`,
    [theirs, ours, source, specs, checked, isPublic, pct(ours, theirs), body.id as string]
  );
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'comparison_updated', entityType: 'comparison', entityId: String(body.id) });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  await getDb().query('DELETE FROM pricing_comparisons WHERE id = $1', [id]);
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'comparison_deleted', entityType: 'comparison', entityId: id });
  return NextResponse.json({ ok: true });
}
