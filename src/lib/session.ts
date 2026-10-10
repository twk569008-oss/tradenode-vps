import { cookies, headers } from 'next/headers';
import { SESSION_COOKIE, getUserBySessionToken, type SessionUser } from '@/lib/auth';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserBySessionToken(token);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') throw new Response('Forbidden', { status: 403 });
  return user;
}

export { SESSION_COOKIE };
