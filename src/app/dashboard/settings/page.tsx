import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/session';
import { pickLocale } from '@/lib/i18n';
import { PasswordChange } from '@/components/PasswordChange';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const jar = await cookies();
  const locale = pickLocale(jar.get('locale')?.value ?? user?.locale);
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">{t('Account information', 'معلومات الحساب')}</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">{t('Name', 'الاسم')}</span><span>{user!.name}</span></div>
          <div className="flex justify-between rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">{t('Email', 'البريد')}</span><span>{user!.email}</span></div>
          <div className="flex justify-between rounded-lg p-3" style={{ background: 'var(--bg-2)' }}><span className="text-muted">{t('Member since', 'عضو منذ')}</span><span>{new Date(user!.created_at as string).toLocaleDateString()}</span></div>
        </div>
      </div>
      <PasswordChange locale={locale} />
    </div>
  );
}
