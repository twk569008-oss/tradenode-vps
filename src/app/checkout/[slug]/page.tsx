import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/db';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { CheckoutClient } from '@/components/CheckoutClient';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value);
  const user = await getCurrentUser();

  const planRes = await getDb().query('SELECT * FROM plans WHERE slug = $1 AND is_active = true', [slug]);
  const plan = planRes.rows[0] as Record<string, string | number> | undefined;
  if (!plan || plan.is_soldout) notFound();

  return (
    <div className="container-app py-12">
      <h1 className="text-2xl font-bold mb-8">
        {locale === 'ar' ? 'إتمام الطلب' : 'Checkout'}
      </h1>
      <CheckoutClient
        plan={plan as never}
        locale={locale}
        loggedIn={Boolean(user)}
      />
    </div>
  );
}
