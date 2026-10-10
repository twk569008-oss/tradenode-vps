import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });
  return NextResponse.json({
    id: user.id, name: user.name, email: user.email, role: user.role, locale: user.locale, theme: user.theme,
  });
}
