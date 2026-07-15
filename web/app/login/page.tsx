'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { saveSession } from '@/lib/auth';

/** Login screen. On success it stores the session and heads to the dashboard. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('whiskers@meowpay.cat');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.login({ email, password });
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
        <h1>Welcome back</h1>
        <p className="muted">Sign in to send treats.</p>

        <form onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <div className="alert error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16 }}>
          New here? <Link href="/register">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
