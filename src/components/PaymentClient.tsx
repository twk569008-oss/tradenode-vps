'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { qrDataUrl } from '@/lib/qr-client';
import { Copy, Check, TriangleAlert, Loader2, ArrowRight } from 'lucide-react';

type Net = {
  code: string; name: string; nameAr: string; chain: string; address: string; confirmations: number;
  requiredAmount: number | null; requiredSymbol: string | null; rateUsd: number | null;
};

export function PaymentClient({ orderNumber, locale }: { orderNumber: string; locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const t = (en: string, arS: string) => (ar ? arS : en);

  const [data, setData] = useState<{ order: { orderNumber: string; status: string; price: number }; networks: Net[] } | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/payment?order=${encodeURIComponent(orderNumber)}`)
      .then((r) => r.json())
      .then(async (d) => {
        if (d.error) { setErr(d.error); return; }
        setData(d);
        setSel(d.networks[0]?.code ?? null);
        const map: Record<string, string> = {};
        for (const n of d.networks) {
          map[n.code] = await qrDataUrl(n.address, 220);
        }
        setQrs(map);
      })
      .catch(() => setErr('failed_to_load'));
  }, [orderNumber]);

  const net = data?.networks.find((n) => n.code === sel) ?? null;

  function copyAddress() {
    if (!net) return;
    navigator.clipboard.writeText(net.address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function amountText(): string {
    if (!net) return '—';
    if (net.requiredAmount !== null && net.requiredSymbol) {
      const a = net.requiredAmount;
      const s = net.requiredSymbol === 'USDT' ? a.toFixed(2) : a.toFixed(8);
      return `${s} ${net.requiredSymbol}`;
    }
    return t('Rate unavailable — contact support for the exact amount', 'المعدل غير متاح — اتصل بالدعم لمعرفة المبلغ بالضبط');
  }

  if (err) return <div className="card p-8 text-center text-sm badge badge-red">{t('Could not load payment details.', 'تعذر تحميل تفاصيل الدفع.')}</div>;
  if (!data) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--accent-2)]" aria-hidden /></div>;

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Step 1: network */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="font-bold text-lg mb-2">1. {t('Select network', 'اختر الشبكة')}</h2>
        {data.networks.map((n) => (
          <button key={n.code} onClick={() => setSel(n.code)}
            className="card card-hover w-full p-4 text-start flex items-center gap-4"
            style={sel === n.code ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent-2)' }}>
              {n.code.slice(0, 3)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{ar ? n.nameAr : n.name}</div>
              <div className="text-xs text-muted truncate">{n.chain}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Step 2: send */}
      <div className="lg:col-span-3 space-y-5">
        <h2 className="font-bold text-lg">2. {t('Send payment', 'أرسل الدفعة')}</h2>

        <div className="card p-5">
          <div className="text-xs text-muted mb-1">{t('Order amount (USD)', 'مبلغ الطلب (USD)')}</div>
          <div className="text-2xl font-extrabold">${data.order.price.toFixed(2)}</div>
          <div className="hairline my-4" />
          <div className="text-xs text-muted mb-1">{t('Required amount', 'المبلغ المطلوب')}</div>
          <div className="text-lg font-bold text-[var(--accent-2)]">{amountText()}</div>
          {net?.rateUsd != null && net.requiredSymbol !== 'USDT' && (
            <div className="text-xs text-muted mt-1">{t(`Rate: 1 ${net.requiredSymbol} ≈ $${net.rateUsd.toLocaleString()}`, `المعدل: 1 ${net.requiredSymbol} ≈ $${net.rateUsd.toLocaleString()}`)}</div>
          )}
        </div>

        {net && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-muted">{t('Network', 'الشبكة')}</div>
                <div className="font-semibold text-sm">{ar ? net.nameAr : net.name} · {net.chain}</div>
              </div>
              <div className="badge">{t(`${net.confirmations} confirmation${net.confirmations > 1 ? 's' : ''} required`, `يلزم ${net.confirmations} تأكيد`)}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-5 items-center">
              {qrs[net.code] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrs[net.code]} alt={t('Deposit address QR code', 'رمز QR لعنوان الإيداع')} className="w-40 h-40 rounded-lg shrink-0" />
              ) : <div className="w-40 h-40" />}
              <div className="flex-1 min-w-0 w-full">
                <div className="text-xs text-muted mb-1">{t('Deposit address', 'عنوان الإيداع')}</div>
                <div className="rounded-lg p-3 text-xs break-all font-mono" style={{ background: 'var(--bg-2)' }} dir="ltr">{net.address}</div>
                <button onClick={copyAddress} className="btn btn-secondary mt-3 text-xs">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? t('Copied', 'تم النسخ') : t('Copy address', 'انسخ العنوان')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="card p-5" style={{ borderColor: 'rgba(251,191,36,0.35)', background: 'rgba(251,191,36,0.06)' }}>
          <div className="flex gap-3 items-start">
            <TriangleAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
            <div className="text-sm">
              <div className="font-semibold mb-1">{t('Sending on the wrong network may result in permanent loss of funds.', 'الإرسال عبر الشبكة الخاطئة قد يؤدي إلى فقدان الأموال نهائياً.')}</div>
              <p className="text-xs text-muted">
                {t('Verify the network matches your withdrawal exchange or wallet before sending. Send only the cryptocurrency shown for the selected network. We never ask for seed phrases or private keys.',
                    'تأكد من تطابق الشبكة مع منصة السحب أو محفظتك قبل الإرسال. أرسل فقط العملة الظاهرة للشبكة المختارة. لا نطلب عبارات الاسترداد أو المفاتيح الخاصة أبداً.')}
              </p>
            </div>
          </div>
        </div>

        <Link href={`/payment/${orderNumber}/proof`} className="btn btn-primary w-full justify-center">
          {t('I have paid — submit payment proof', 'لقد دفعت — أرسل إثبات الدفعة')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
