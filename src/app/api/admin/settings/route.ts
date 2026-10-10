import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { getAllSettings, setSetting } from '@/lib/settings';
import { writeAudit } from '@/lib/auth';

const ALLOWED_KEYS = [
  'site.name', 'site.tagline_en', 'site.tagline_ar', 'site.support_email',
  'site.estimated_delivery_window', 'billing.max_upfront_months',
  'provisioning.mode', 'provisioning.automation_enabled', 'provisioning.provider',
  'payments.manual_review_required', 'payments.allow_admin_manual_amount',
  'security.upload_max_bytes', 'security.allowed_upload_mimes', 'security.session_ttl_hours',
  'maintenance.show_fake_metrics',
];

const schema = z.object({ values: z.record(z.string(), z.string().max(4000)) });

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const all = await getAllSettings();
  const safe: Record<string, string> = {};
  for (const k of ALLOWED_KEYS) if (k in all) safe[k] = all[k];
  return NextResponse.json({ settings: safe, allowedKeys: ALLOWED_KEYS });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });

  const changed: string[] = [];
  for (const [k, v] of Object.entries(parsed.data.values)) {
    if (!ALLOWED_KEYS.includes(k)) continue;
    await setSetting(k, v);
    changed.push(k);
  }
  await writeAudit({ actorId: user.id, actorRole: 'admin', action: 'settings_updated', entityType: 'settings', details: { keys: changed } });
  return NextResponse.json({ ok: true, changed });
}
