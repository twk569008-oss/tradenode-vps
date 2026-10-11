import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

/** GET /api/auth/me — minimal profile of the logged-in user (no secrets). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: {
      id: user.id as string,
      name: user.name as string,
      email: user.email as string,
      role: user.role as string,
    },
  });
}
