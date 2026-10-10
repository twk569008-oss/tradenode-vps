'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch('/api/auth/forgot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch { /* uniform */ }
    finally { setBusy(false); setSent(true); }
  }

  return (
    <div className="container-app py-16 max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Reset your password</h1>
      </div>
      {sent ? (
        <div className="card p-8 text-center">
          <MailCheck className="h-10 w-10 text-green-400 mx-auto mb-3" aria-hidden />
          <p className="text-sm mb-4">If that email exists, a single-use reset link is on its way. It expires in 60 minutes.</p>
          <Link href="/login" className="btn btn-secondary text-xs">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card p-6 space-y-4">
          <div>
            <label className="label" htmlFor="femail">Email</label>
            <input id="femail" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>
          <button disabled={busy} className="btn btn-primary w-full justify-center">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Send reset link
          </button>
          <p className="text-xs text-muted text-center">Remembered it? <Link href="/login" className="text-[var(--accent-2)] hover:underline">Log in</Link></p>
        </form>
      )}
    </div>
  );
}
