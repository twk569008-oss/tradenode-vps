'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2, AtSign, UserCheck, UserX, Eye, EyeOff } from 'lucide-react';

const USERNAME_RE = /^[\w.-]{3,32}$/;

type CheckState = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export default function RegisterPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '';
  const ref = search.get('ref') || '';

  const [locale] = useState<'en' | 'ar'>(() => {
    if (typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|;\s*)locale=(en|ar)/);
      if (m) return m[1] as 'en' | 'ar';
    }
    return 'ar';
  });
  const ar = locale === 'ar';
  const t = (enS: string, arS: string) => (ar ? arS : enS);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unameCheck, setUnameCheck] = useState<CheckState>('idle');
  const [unameSuggests, setUnameSuggests] = useState<string[]>([]);
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string; suggestion?: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const policy = {
    len: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const policyOk = Object.values(policy).every(Boolean);
  const usernameOk = USERNAME_RE.test(username);

  function strength(): number {
    return Object.values(policy).filter(Boolean).length;
  }

  // Real-time username availability check (debounced)
  useEffect(() => {
    const v = username.trim();
    if (!v || !USERNAME_RE.test(v)) { setUnameCheck('idle'); setUnameSuggests([]); return; }
    setUnameCheck('checking');
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/username-check?username=${encodeURIComponent(v)}`);
        const d = await r.json().catch(() => ({ available: false }));
        if (d.available) { setUnameCheck('available'); setUnameSuggests([]); }
        else if (d.reason === 'reserved') { setUnameCheck('taken'); setUnameSuggests([]); }
        else if (d.reason === 'taken') {
          setUnameCheck('taken');
          // Build friendly suggestions locally
          const base = v.replace(/[^\w]/g, '');
          const suffixes = [base + (new Date().getFullYear() % 100), base + Math.floor(Math.random() * 900 + 100), 'tn_' + base, base + '_vps'];
          setUnameSuggests(suffixes.filter((s) => s !== v && USERNAME_RE.test(s)).slice(0, 3));
        }
        else setUnameCheck('invalid');
      } catch { setUnameCheck('idle'); }
    }, 550);
    return () => clearTimeout(timer);
  }, [username]);

  async function checkEmail() {
    const v = email.trim();
    if (!v || !v.includes('@')) return;
    try {
      const res = await fetch(`/api/auth/email-exists?email=${encodeURIComponent(v)}`);
      if (res.status === 404) return;
      const d = await res.json().catch(() => ({ exists: false }));
      if (d.exists) setEmailMsg({ ok: false, text: t('This email is already registered — log in instead.', 'هذا البريد مسجل مسبقاً — سجّل دخولك بدلاً من ذلك.'), suggestion: true });
      else setEmailMsg({ ok: true, text: t('Email available.', 'البريد متاح.') });
    } catch { /* ignore */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!usernameOk) {
      setErr(ar ? 'اسم المستخدم: ٣–٣٢ حرفاً — حروف وأرقام ونقطة وشرطة سفلية فقط.' : 'Username: 3–32 chars — letters, numbers, dot, dash, underscore only.');
      return;
    }
    if (unameCheck === 'taken') {
      setErr(ar ? 'اسم المستخدم محجوز — اختر اسماً آخر من الاقتراحات.' : 'Username is taken — pick another (try a suggestion below).');
      return;
    }
    if (!policyOk) { setErr(ar ? 'كلمة المرور لا تلبّي الشروط بالأسفل.' : 'Password does not meet the requirements below.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username.trim(), email: email.trim(), password, locale, ref: ref || undefined }),
      });
      const d = await res.json().catch(() => ({}) as { code?: string; error?: string });
      if (res.ok) { router.push(next && next.startsWith('/') ? next : '/dashboard'); router.refresh(); return; }
      if (d.code === 'email_in_use' || d.error === 'email_in_use') {
        setEmailMsg({ ok: false, text: t('This email is already registered — log in instead.', 'هذا البريد مسجل مسبقاً — سجّل دخولك بدلاً من ذلك.'), suggestion: true });
        return;
      }
      if (d.code === 'username_taken') {
        setUnameCheck('taken');
        setErr(ar ? 'اسم المستخدم محجوز — اختر اسماً آخر.' : 'Username is taken — pick another.');
        return;
      }
      const map: Record<string, string> = {
        weak_password: ar ? 'كلمة المرور لا تلبّي الشروط بالأسفل.' : 'Password does not meet the requirements below.',
        rate_limited: ar ? 'محاولات كثيرة — انتظر بضع دقائق.' : 'Too many attempts — wait a few minutes.',
        invalid_input: ar ? 'تحقق من بياناتك وحاول مجدداً.' : 'Check your details and try again.',
      };
      setErr(map[d.error as string] ?? (ar ? 'فشل إنشاء الحساب. حاول مجدداً.' : 'Registration failed. Try again.'));
    } catch {
      setErr(ar ? 'خطأ في الشبكة. حاول مجدداً.' : 'Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const unameIcon =
    unameCheck === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" aria-hidden /> :
    unameCheck === 'available' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" aria-hidden /> :
    unameCheck === 'taken' ? <UserX className="h-3.5 w-3.5 text-amber-400" aria-hidden /> :
    unameCheck === 'invalid' ? <AlertCircle className="h-3.5 w-3.5 text-amber-400" aria-hidden /> : null;

  const unameText =
    unameCheck === 'checking' ? t('Checking availability…', 'جارٍ فحص التوفر…') :
    unameCheck === 'available' ? t('✓ Username is available!', '✓ اسم المستخدم متاح!') :
    unameCheck === 'taken' ? t('That username is already in use.', 'اسم المستخدم مستخدم بالفعل.') :
    unameCheck === 'invalid' ? t('Only letters, numbers, dot, dash, underscore; 3–32 chars.', 'حروف وأرقام ونقطة وشرطة فقط؛ ٣–٣٢ حرفاً.') : '';

  return (
    <div className="container-app py-14 max-w-md mx-auto" dir={ar ? 'rtl' : 'ltr'}>
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
          <AtSign className="h-6 w-6 text-[var(--accent-2)]" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">{t('Create your account', 'أنشئ حسابك')}</h1>
        <p className="text-sm text-muted mt-1">{t('Order a VPS in a few minutes.', 'اطلب خادمك خلال دقائق.')}</p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label" htmlFor="uname">{t('Username', 'اسم المستخدم')}</label>
          <input id="uname" className="input" value={username} onChange={(e) => { setUsername(e.target.value); }}
            required minLength={3} maxLength={32} placeholder={t('e.g. gold_scalper', 'مثال: gold_scalper')} dir="ltr" autoComplete="username" />
          {unameText && (
            <p className={`text-xs mt-2 flex items-center gap-2 ${unameCheck === 'available' ? 'text-green-400' : 'text-amber-400'}`}>
              {unameIcon}
              <span>{unameText}</span>
            </p>
          )}
          {unameCheck === 'taken' && unameSuggests.length > 0 && (
            <div className="mt-2 rounded-lg p-3 text-xs" style={{ background: 'var(--bg-2)' }}>
              <p className="text-muted mb-2 flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" aria-hidden /> {t('Try one of these:', 'جرب أحد هذه:')}</p>
              <div className="flex gap-2 flex-wrap">
                {unameSuggests.map((s) => (
                  <button key={s} type="button" onClick={() => { setUsername(s); setUnameSuggests([]); }}
                    className="btn btn-secondary !py-1 !px-2.5 text-xs font-mono">{s}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="label" htmlFor="remail">{t('Email', 'البريد الإلكتروني')}</label>
          <input id="remail" type="email" className="input" value={email} onChange={(e) => { setEmail(e.target.value); setEmailMsg(null); }} onBlur={checkEmail} required placeholder="you@example.com" dir="ltr" autoComplete="email" />
          {emailMsg && (
            <p className={`text-xs mt-2 flex items-center gap-2 ${emailMsg.ok ? 'text-green-400' : 'text-amber-400'}`}>
              {emailMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden />}
              <span>{emailMsg.text}</span>
              {emailMsg.suggestion && <Link href="/login" className="text-[var(--accent-2)] hover:underline ms-1">{t('Log in →', 'سجّل دخولك →')}</Link>}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="rpassword">{t('Password', 'كلمة المرور')}</label>
          <div className="relative">
            <input id="rpassword" type={show ? 'text' : 'password'} className="input pwd-input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder={t('Strong password', 'كلمة مرور قوية')} dir="ltr" />
            <button type="button" onClick={() => setShow(!show)} className="pwd-toggle" aria-label={show ? t('Hide password', 'إخفاء') : t('Show password', 'إظهار')}>
              {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
          {password && (
            <div className="mt-3">
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-1 flex-1 rounded-full" style={{ background: i <= strength() ? 'var(--accent)' : 'var(--stroke-1)' }} />
                ))}
              </div>
              <ul className="text-xs space-y-1">
                <li className={policy.len ? 'text-green-400' : 'text-muted'}>✓ {t('10+ characters', '١٠+ حروف')}</li>
                <li className={policy.upper && policy.lower ? 'text-green-400' : 'text-muted'}>✓ {t('Upper & lower case', 'حروف كبيرة وصغيرة')}</li>
                <li className={policy.digit ? 'text-green-400' : 'text-muted'}>✓ {t('A number', 'رقم واحد')}</li>
                <li className={policy.symbol ? 'text-green-400' : 'text-muted'}>✓ {t('A symbol', 'رمز واحد')}</li>
              </ul>
            </div>
          )}
        </div>

        {err && <p className="text-xs badge badge-red">{err}</p>}

        <button disabled={busy || !policyOk || !usernameOk || unameCheck === 'taken'} className="btn btn-primary w-full justify-center">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {t('Create account', 'إنشاء الحساب')}
        </button>

        <p className="text-xs text-muted text-center pt-2">
          {t('Already registered?', 'مسجل مسبقاً؟')}{' '}
          <Link href="/login" className="text-[var(--accent-2)] hover:underline">{t('Log in', 'سجّل دخولك')}</Link>
        </p>
      </form>
    </div>
  );
}
