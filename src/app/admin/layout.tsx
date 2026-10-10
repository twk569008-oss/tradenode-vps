import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/session';
import { AdminShell } from '@/components/AdminShell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') redirect('/login?next=/admin');
  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>;
}
