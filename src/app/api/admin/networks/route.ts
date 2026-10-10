import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { writeAudit } from '@/lib/auth';

const schema = z.object({
  id: z.string().min(2).max(40),
  deposit_address: z.string().min(10).max(200).optional(),
  is_active: z.boolean().optional(),
  confirmations_required: z.number().int().min(0).max(100).optional(),
  name_en: z.string().max(80).optional(),
  name_ar: z.string().max(80).optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const res = await getDb().query('SELECT * FROM payment_networks ORDER BY sort_order ASC');
  return NextResponse.json({ networks: res.rows });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const { id, ...fields } = parsed.data;

  const db = getDb();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    sets.push(`${k} = $${params.length + 1}`); params.push(v);
  }
  if (sets.length === 0) return NextResponse.json({ ok: true });
  params.push(id);
  await db.query(`UPDATE payment_networks SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'payment_network_updated', entityType: 'payment_network', entityId: id, details: { fields: Object.keys(fields) } });
  return NextResponse.json({ ok: true });
}
