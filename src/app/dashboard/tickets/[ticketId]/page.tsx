import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { TicketThread } from '@/components/TicketThread';

export const dynamic = 'force-dynamic';

export default async function TicketDetail({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const jar = await cookies();
  const user = await getCurrentUser();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  return <TicketThread ticketId={ticketId} locale={locale} />;
}
