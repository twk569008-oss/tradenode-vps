'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Gift, TrendingUp, Users, Wallet, Share2 } from 'lucide-react';

type ReferralData = {
  code: string | null;
  balance: number;
  totalReferrals: number;
  earnings: Array<{ order_number: string; amount: string; created_at: string; buyer_name: string }>;
};

export function ReferralCard({ locale }: { locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    fetch('/api/referral').then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
  }, []);

  if (!data || !data.code) return null;

  const code = data.code;
  const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/register?ref=${code.replace(/^TN-?/, '')}`;
  const displayedCode = code.startsWith('TN') ? `TN-${code.slice(2)}` : code;

  async function copy(what: 'code' | 'link') {
    const text = what === 'code' ? displayedCode : link;
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(what);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="card p-6" style={{ borderColor: 'var(--accent)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), #26a869)' }}>
          <Gift className="h-5 w-5 text-white" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg">{t('Referral program', 'برنامج الإحالة')}</h2>
          <p className="text-xs text-muted">{t('Invite friends — earn 20% of every verified order they place.', 'ادعُ أصدقاءك — اربح 20% من كل طلب مؤكد يقومون به.')}</p>
        </div>
      </div>

      {/* Highlight banner */}
      <div className="rounded-xl p-4 mb-5 flex items-center gap-3 flex-wrap" style={{ background: 'linear-gradient(90deg, rgba(76,141,255,0.12), rgba(52,211,153,0.12))', border: '1px solid var(--stroke-2)' }}>
        <TrendingUp className="h-6 w-6 text-green-400 shrink-0" aria-hidden />
        <p className="text-sm font-semibold">
          {t('You will earn 20% back from every purchase made by people you refer — automatically, on every order they pay.',
              'ستسترد 20% من كل شخص تشير إليه — تلقائياً وعن كل طلب يدفعوه.')}
        </p>
      </div>

      {/* Code + link */}
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)' }}>
          <p className="text-xs text-muted mb-1.5">{t('Your referral code', 'كود الإحالة الخاص بك')}</p>
          <div className="flex items-center gap-2">
            <code className="font-mono font-bold text-base tracking-wider flex-1 truncate" dir="ltr">{displayedCode}</code>
            <button onClick={() => copy('code')} className="btn btn-secondary !py-1.5 !px-2.5 text-xs shrink-0" aria-label={t('Copy code', 'نسخ الكود')}>
              {copied === 'code' ? <Check className="h-3.5 w-3.5 text-green-400" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </div>
        </div>
        <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)' }}>
          <p className="text-xs text-muted mb-1.5">{t('Your invite link', 'رابط الدعوة')}</p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs flex-1 truncate text-muted" dir="ltr">{link}</code>
            <button onClick={() => copy('link')} className="btn btn-secondary !py-1.5 !px-2.5 text-xs shrink-0" aria-label={t('Copy link', 'نسخ الرابط')}>
              {copied === 'link' ? <Check className="h-3.5 w-3.5 text-green-400" aria-hidden /> : <Share2 className="h-3.5 w-3.5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--bg-2)' }}>
          <Users className="h-5 w-5 mx-auto mb-1 text-[var(--accent-2)]" aria-hidden />
          <div className="text-xl font-extrabold">{data.totalReferrals}</div>
          <div className="text-xs text-muted">{t('People referred', 'شخص أُحيلوا')}</div>
        </div>
        <div className="rounded-lg p-4 text-center" style={{ background: 'var(--bg-2)' }}>
          <Wallet className="h-5 w-5 mx-auto mb-1 text-green-400" aria-hidden />
          <div className="text-xl font-extrabold text-green-400">${data.balance.toFixed(2)}</div>
          <div className="text-xs text-muted">{t('Commission earned', 'أرباح العمولة')}</div>
        </div>
      </div>

      {/* Earnings list */}
      {data.earnings.length > 0 && (
        <div>
          <p className="label mb-2">{t('Recent commissions', 'أحدث العمولات')}</p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {data.earnings.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--bg-2)' }}>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{e.buyer_name}</p>
                  <p className="text-xs text-muted" dir="ltr">{e.order_number}</p>
                </div>
                <span className="font-bold text-green-400 shrink-0">+${Number(e.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
