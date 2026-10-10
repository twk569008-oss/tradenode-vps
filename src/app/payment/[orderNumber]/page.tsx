import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { pickLocale } from '@/lib/i18n';
import { getCurrentUser } from '@/lib/session';
import { getDb } from '@/db/db';
import { PaymentClient } from '@/components/PaymentClient';

export const dynamic = 'force-dynamic';

export default async function PaymentPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const ar = locale === 'ar';

  // Ownership check server-side, not just in the API.
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/payment/${orderNumber}`)}`);
  const orderRes = await getDb().query('SELECT id FROM orders WHERE order_number = $1 AND user_id = $2', [orderNumber, user.id]);
  const order = orderRes.rows[0];
  if (!order) notFound();

  return (
    <div className="container-app py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ar ? 'إتمام الدفع' : 'Complete Payment'}</h1>
          <p className="text-sm text-muted mt-1">
            {ar ? 'الطلب ' : 'Order '} <span className="font-mono font-semibold">{orderNumber}</span>
          </p>
        </div>
        <span className="badge badge-amber">{ar ? 'بانتظار الدفع' : 'Awaiting payment'}</span>
      </div>
      <PaymentClient orderNumber={orderNumber} locale={locale} />
    </div>
  );
}
