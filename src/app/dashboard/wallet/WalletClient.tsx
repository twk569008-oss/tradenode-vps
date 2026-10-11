'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Wallet as WalletIcon, CheckCircle2, Clock, XCircle, Plus } from 'lucide-react';

type Tx = {
  id: string; type: string; amount: string; status: string;
  order_number: string | null; note: string | null; created_at: string;
};

const DEPOSIT_AMOUNTS = [5, 10, 20, 50, 100, 250];

export function WalletClient({ locale }: { locale: 'en' | 'ar' }) {
  const ar = locale === 'ar';
  const t = (en: string, a: string) => (ar ? a : en);

  const [data, setData] = useState<{ balance: number; transactions: Tx[] } | null>(null);
  const [amount, setAmount] = useState<number>(10);
  const [network, setNetwork] = useState<string>('');
  const [networks, setNetworks] = useState<Array<{ code: string; label: string; address: string; currency: string }>>([]);
  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch('/api/wallet').then((r) => (r.ok ? r.json() : null)).then(setData).catch(() => {});
    fetch('/api/payment-methods').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (d?.networks) { setNetworks(d.networks); setNetwork(d.networks[0]?.code ?? ''); }
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const sel = networks.find((n) => n.code === network) ?? null;

  async function submitDeposit() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amount, networkCode: network, transactionHash: txHash.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}) as { depositId?: string; error?: string });
      if (res.ok && d.depositId && proofFile) {
        const fd = new FormData();
        fd.append('depositId', d.depositId);
        fd.append('proof', proofFile);
        await fetch('/api/wallet/deposit-proof', { method: 'POST', body: fd });
      }
      if (res.ok) {
        setMsg({ ok: true, text: t('Deposit request sent — a human will verify it shortly and your balance will update.', 'تم إرسال طلب الشحن — سيتحقق منه شخص قريباً وسيُحدَّث رصيدك.') });
        setTxHash(''); setProofFile(null);
        load();
      } else {
        const map: Record<string, string> = {
          auth_required: t('Please log in first.', 'سجّل دخولك أولاً.'),
          unsupported_file: t('Only PNG/JPG/WebP up to 6 MB.', 'الصيغ المسموحة PNG/JPG/WebP حتى 6 MB.'),
          invalid_input: t('Check the amount and network.', 'تحقق من المبلغ والشبكة.'),
        };
        setMsg({ ok: false, text: map[d.error as string] ?? t('Something went wrong. Try again.', 'حدث خطأ. حاول مجدداً.') });
      }
    } finally { setBusy(false); }
  }

  const statusIcon = (s: string) =>
    s === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden /> :
    s === 'rejected' ? <XCircle className="h-3.5 w-3.5 text-red-400" aria-hidden /> :
    <Clock className="h-3.5 w-3.5 text-amber-400" aria-hidden />;

  return (
    <div className="space-y-6">
      {/* Balance hero card */}
      <div className="card p-7 flex items-center gap-5 flex-wrap" style={{ background: 'linear-gradient(135deg, var(--bg-1), rgba(76,141,255,0.08))', borderColor: 'var(--accent)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--accent), #26a869)' }}>
          <WalletIcon className="h-7 w-7 text-white" aria-hidden />
        </div>
        <div className="flex-1 min-w-[180px]">
          <p className="text-xs text-muted mb-1">{t('Available balance', 'الرصيد المتاح')}</p>
          <p className="text-3xl font-extrabold tracking-tight">${(data?.balance ?? 0).toFixed(2)}</p>
        </div>
        <p className="text-xs text-muted max-w-xs leading-relaxed">
          {t('Use your balance to pay instantly for any plan — no waiting for payment review. Deposit with crypto; a human verifies each top-up.', 'استخدم رصيدك للدفع الفوري لأي خطة — بدون انتظار مراجعة الدفع. اشحن بالعملة الرقمية ويتحقق من كل إيداع شخص حقيقي.')}
        </p>
      </div>

      {/* Deposit form */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--accent-2)]" aria-hidden /> {t('Top up wallet', 'شحن المحفظة')}</h2>
        <div className="grid gap-4">
          <div>
            <label className="label">{t('Amount (USD)', 'المبلغ (USD)')}</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {DEPOSIT_AMOUNTS.map((v) => (
                <button key={v} type="button" onClick={() => setAmount(v)}
                  className="btn btn-secondary !py-1.5 !px-3 text-xs"
                  style={amount === v ? { borderColor: 'var(--accent)', color: 'var(--accent-2)', background: 'var(--accent-soft)' } : undefined}>
                  ${v}
                </button>
              ))}
            </div>
            <input type="number" className="input !w-40" value={amount} min={1} max={5000}
              onChange={(e) => setAmount(Math.min(5000, Math.max(1, Number(e.target.value) || 1)))} dir="ltr" />
          </div>
          <div>
            <label className="label">{t('Payment network', 'شبكة الدفع')}</label>
            <select className="input" value={network} onChange={(e) => setNetwork(e.target.value)}>
              {networks.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
            </select>
            {sel && (
              <div className="mt-2 rounded-lg p-3 text-xs" style={{ background: 'var(--bg-2)' }}>
                <p className="text-muted mb-1">{t('Send exactly to this address:', 'أرسل المبلغ بالضبط لهذا العنوان:')}</p>
                <code className="font-mono break-all" dir="ltr">{sel.address}</code>
              </div>
            )}
          </div>
          <div>
            <label className="label">{t('Transaction hash (optional)', 'رمز العملية (اختياري)')}</label>
            <input className="input" value={txHash} onChange={(e) => setTxHash(e.target.value)} dir="ltr" maxLength={200} placeholder="0x… / T… / bc1q…" />
          </div>
          <div>
            <label className="label">{t('Payment screenshot', 'لقطة شاشة الدفع')}</label>
            <input type="file" accept="image/png,image/jpeg,image/webp" className="input"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted mt-1">{t('PNG / JPG / WebP — max 6 MB', 'PNG / JPG / WebP — حتى 6 MB')}</p>
          </div>
          {msg && <p className={`text-xs badge ${msg.ok ? 'badge-green' : 'badge-red'}`}>{msg.text}</p>}
          <button onClick={submitDeposit} disabled={busy || !network} className="btn btn-primary w-fit">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t('Submit deposit request', 'إرسال طلب الشحن')}
          </button>
        </div>
      </div>

      {/* History */}
      <div className="card p-6">
        <h2 className="font-bold text-lg mb-4">{t('Transaction history', 'سجل العمليات')}</h2>
        {!data || data.transactions.length === 0 ? (
          <p className="text-sm text-muted">{t('No transactions yet — your deposits and order payments will appear here.', 'لا عمليات بعد — ستظهر عمليات الشحن والدفع هنا.')}</p>
        ) : (
          <div className="space-y-2">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm" style={{ background: 'var(--bg-2)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(tx.status)}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {tx.type === 'deposit' ? t('Wallet deposit', 'شحن محفظة') :
                       tx.type === 'spend' ? t('Order payment', 'دفع طلب') :
                       tx.type === 'commission' ? t('Referral commission', 'عمولة إحالة') : t('Refund', 'استرداد')}
                    </p>
                    <p className="text-xs text-muted" dir="ltr">{new Date(tx.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <p className={`font-bold ${tx.type === 'deposit' || tx.type === 'commission' || tx.type === 'refund' ? 'text-green-400' : ''}`}>
                    {tx.type === 'spend' ? '−' : '+'}${Number(tx.amount).toFixed(2)}
                  </p>
                  <p className={`text-xs ${tx.status === 'approved' ? 'text-green-400' : tx.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>
                    {tx.status === 'approved' ? t('approved', 'مؤكد') : tx.status === 'rejected' ? t('rejected', 'مرفوض') : t('under review', 'قيد المراجعة')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
