import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { WalletClient } from './WalletClient';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  return <WalletClient locale={locale} />;
}
