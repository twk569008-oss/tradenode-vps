import { cookies } from 'next/headers';
import { pickLocale } from '@/lib/i18n';
import { AdminWalletDeposits } from '@/components/AdminWalletDeposits';

export const dynamic = 'force-dynamic';

export default async function AdminWalletDepositsPage() {
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  return <AdminWalletDeposits locale={locale} />;
}
