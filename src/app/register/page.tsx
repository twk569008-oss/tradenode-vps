'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2, AtSign, Eye, EyeOff } from 'lucide-react';

const USERNAME_RE = /^[\w.-]{3,32}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState<{ ok: boolean; text: string } | null>(null);
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

  async function checkUsername() {
    const v = username.trim();
    if (!v) return;
    if (!USERNAME_RE.test(v)) {
      setUsernameMsg({ ok: false, text: '3–32 characters: letters, numbers, dot, dash, underscore.' });
      return;
    }
    try {
      const r = await fetch(`/api/auth/username-check?username=${encodeURIComponent(v)}`);
      const d = await r.json().catch(() => ({ available: false }));
      if (d.available) setUsernameMsg({ ok: true, text: 'Username is available.' });
      else if (d.reason === 'reserved') setUsernameMsg({ ok: false, text: 'That name is reserved. Pick another.' });
      else if (d.reason === 'taken') setUsernameMsg({ ok: false, text: 'That username is taken. Try another.' });
      else setUsernameMsg({ ok: false, text: 'Only letters, numbers, dot, dash, underscore; 3–32 chars.' });
    } catch { setUsernameMsg({ ok: false, text: 'Could not check availability.' }); }
  }

  async function checkEmail() {
    const v = email.trim();
    if (!v || !v.includes('@')) return;
    try {
      const res = await fetch(`/api/auth/email-exists?email=${encodeURIComponent(v)}`);
      if (res.status === 404) return;
      const d = await res.json().catch(() => ({ exists: false }));
      if (d.exists) setEmailMsg({ ok: false, text: 'This email is already registered — log in instead.', suggestion: true });
      else setEmailMsg({ ok: true, text: 'Email available.' });
    } catch { /* ignore */ }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!pathnameOk()) { setErr('Please use only letters, numbers, dot, dash, or underscore for the username.'); return; }
    if (!policyOk) { setErr('Password does not meet the requirements below.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username.trim(), email: email.trim(), password, locale: 'en' }),
      });
      const d = await res.json().catch(() => ({}) as { code?: string; error?: string });
      if (res.ok) { router.push('/dashboard'); router.refresh(); return; }
      if (d.code === 'email_in_use' || d.error === 'email_in_use') {
        setEmailMsg({ ok: false, text: 'This email is already registered — log in instead.', suggestion: true });
        return;
      }
      if (d.code === 'username_taken') { setUsernameMsg({ ok: false, text: 'That username is taken. Try another.' }); return; }
      const map: Record<string, string> = {
        weak_password: 'Password does not meet the requirements below.',
        rate_limited: 'Too many attempts — wait a few minutes.',
        invalid_input: 'Check your details and try again.',
      };
      setErr(map[d.error as string] ?? 'Registration failed. Try again.');
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function pathnameOk() { return USERNAME_RE.test(username); }

  return (
    <div className="container-app py-14 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
          <AtSign className="h-6 w-6 text-[var(--accent-2)]" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted mt-1">Order a VPS in a few minutes.</p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label" htmlFor="uname">Username</label>
          <input id="uname" className="input" value={username} onChange={(e) => { setUsername(e.target.value); setUsernameMsg(null); }} onBlur={checkUsername}
            required minLength={3} maxLength={32} placeholder="e.g. gold_scarper" dir="ltr" autoComplete="username" />
          {usernameMsg && (
            <p className={`text-xs mt-2 flex items-center gap-2 ${usernameMsg.ok ? 'text-green-400' : 'text-amber-400'}`}>
              {usernameMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden />}
              <span>{usernameMsg.text}</span>
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="remail">Email</label>
          <input id="remail" type="email" className="input" value={email} onChange={(e) => { setEmail(e.target.value); setEmailMsg(null); }} onBlur={checkEmail} required placeholder="you@example.com" autoComplete="email" />
          {emailMsg && (
            <p className={`text-xs mt-2 flex items-center gap-2 ${emailMsg.ok ? 'text-green-400' : 'text-amber-400'}`}>
              {emailMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden />}
              <span>{emailMsg.text}</span>
              {emailMsg.suggestion && <Link href="/login" className="text-[var(--accent-2)] hover:underline ms-1">Log in →</Link>}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="rpassword">Password</label>
          <div className="relative">
            <input id="rpassword" type={show ? 'text' : 'password'} className="input pe-10" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="Strong password" />
            <button type="button" onClick={() => setShow(!show)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted" aria-label={show ? 'Hide password' : 'Show password'}>
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
                <li className={policy.len ? 'text-green-400' : 'text-muted'}>✓ 10+ characters</li>
                <li className={policy.upper && policy.lower ? 'text-green-400' : 'text-muted'}>✓ Upper & lower case</li>
                <li className={policy.digit ? 'text-green-400' : 'text-muted'}>✓ A number</li>
                <li className={policy.symbol ? 'text-green-400' : 'text-muted'}>✓ A symbol</li>
              </ul>
            </div>
          )}
        </div>

        {err && <p className="text-xs badge badge-red">{err}</p>}

        <button disabled={busy || !policyOk || !usernameOk} className="btn btn-primary w-full justify-center">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Create account
        </button>

        <p className="text-xs text-muted text-center pt-2">
          Already registered? <Link href="/login" className="text-[var(--accent-2)] hover:underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
