import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { DashboardShell } from '@/components/DashboardShell';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/dashboard');
  if (user.role === 'admin') redirect('/admin');
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user.locale);
  return <DashboardShell locale={locale}>{children}</DashboardShell>;
}
