'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Server, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const d = await res.json().catch(() => ({}) as { error?: string; redirect?: string });
      if (res.ok && d.redirect) {
        const target = next || d.redirect;
        router.push(next && next.startsWith('/') ? next : target);
        router.refresh();
        return;
      }
      const map: Record<string, string> = {
        invalid_credentials: 'Email or password is incorrect.',
        account_suspended: 'Your account is suspended. Contact support.',
        rate_limited: 'Too many attempts — wait a few minutes.',
        invalid_input: 'Check your email and password.',
      };
      setErr(map[d.error as string] ?? 'Login failed. Try again.');
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container-app py-16 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
          <Server className="h-6 w-6 text-[var(--accent-2)]" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted mt-1">Log in to manage your orders and VPS.</p>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input id="password" type={show ? 'text' : 'password'} className="input pe-10" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Your password" />
            <button type="button" onClick={() => setShow(!show)} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>

        {err && (
          <p className="text-xs badge badge-red flex items-start gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden /><span>{err}</span></p>
        )}

        <button disabled={busy} className="btn btn-primary w-full justify-center">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Log in
        </button>

        <div className="flex items-center justify-between text-xs pt-2">
          <Link href="/forgot-password" className="text-[var(--accent-2)] hover:underline">Forgot password?</Link>
          <span className="text-muted">No account? <Link href="/register" className="text-[var(--accent-2)] hover:underline">Create one</Link></span>
        </div>
      </form>
    </div>
  );
}
