'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { saveSession } from '@/lib/auth';

/** Registration screen. A new cat is created (and funded) then signed in. */
export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ displayName: '', catName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.register(form);
      saveSession(result.accessToken, result.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="center-screen">
      <div className="card" style={{ width: 380 }}>
        <div className="brand" style={{ marginBottom: 20 }}>
          <span className="logo">🐱</span> MeowPay
        </div>
        <h1>Join the clowder</h1>
        <p className="muted">You&apos;ll start with 100 treats to send.</p>

        <form onSubmit={onSubmit}>
          <label htmlFor="displayName">Display name</label>
          <input id="displayName" value={form.displayName} onChange={set('displayName')} placeholder="Sir Fluffington" required />

          <label htmlFor="catName">Handle (catName)</label>
          <input id="catName" value={form.catName} onChange={set('catName')} placeholder="fluffy" required />

          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} required />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={form.password} onChange={set('password')} placeholder="at least 8 characters" required />

          {error && <div className="alert error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
