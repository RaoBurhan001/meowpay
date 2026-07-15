'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

/**
 * Entry point. Sends signed-in cats to their dashboard and everyone else to
 * login. Kept as a thin client-side redirect since auth state lives in the
 * browser for this demo.
 */
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(getToken() ? '/dashboard' : '/login');
  }, [router]);

  return (
    <main className="center-screen">
      <p className="muted">Loading MeowPay…</p>
    </main>
  );
}
