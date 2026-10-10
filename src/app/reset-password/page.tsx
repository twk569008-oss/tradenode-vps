'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

function ResetForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const ok = password.length >= 10 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) { setDone(true); setTimeout(() => router.push('/login'), 2200); return; }
      const d = await res.json().catch(() => ({ error: 'x' }));
      const map: Record<string, string> = {
        invalid_or_expired_token: 'This reset link is invalid or expired. Request a new one.',
        weak_password: 'Password does not meet the requirements.',
        rate_limited: 'Too many attempts — try later.',
      };
      setErr(map[d.error as string] ?? 'Reset failed. Try again.');
    } catch { setErr('Network error.'); }
    finally { setBusy(false); }
  }

  if (!token) return <p className="text-sm text-muted">Missing token. Open the link from your email.</p>;
  if (done) {
    return (
      <div className="card p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" aria-hidden />
        <p className="text-sm">Password updated. Redirecting to login…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card p-6 space-y-4">
      <div>
        <label className="label" htmlFor="npass">New password</label>
        <input id="npass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
        <p className="text-xs text-muted mt-1">10+ characters with upper & lower case, a number, and a symbol.</p>
      </div>
      {err && <p className="text-xs badge badge-red">{err}</p>}
      <button disabled={busy || !ok} className="btn btn-primary w-full justify-center">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Set new password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container-app py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">Choose a new password</h1>
      <Suspense fallback={<p className="text-sm text-muted text-center">Loading…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
