'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, TransferHistoryItem } from '@/lib/api';
import { clearSession, getToken, getUser } from '@/lib/auth';
import { BalanceCard } from '@/components/BalanceCard';
import { SendTreatsForm } from '@/components/SendTreatsForm';
import { TransactionList } from '@/components/TransactionList';

/**
 * The main screen. Owns the live data (balance + history) and re-fetches it
 * after a successful send, so the numbers a user sees always come from the
 * real backend — never optimistic local state.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [catName, setCatName] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<TransferHistoryItem[]>([]);
  const [loadError, setLoadError] = useState('');

  // Pull the current balance and history from the API in parallel.
  const refresh = useCallback(async () => {
    try {
      const [b, h] = await Promise.all([api.getBalance(), api.getHistory()]);
      setBalance(b.balance);
      setCatName(b.catName);
      setHistory(h);
    } catch {
      // Token expired / invalid — send the user back to sign in.
      setLoadError('Your session expired. Please sign in again.');
    }
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setCatName(getUser()?.catName ?? '');
    void refresh();
  }, [router, refresh]);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  return (
    <main className="container">
      <div className="topbar">
        <div className="brand">
          <span className="logo">🐱</span> MeowPay
        </div>
        <button className="link" onClick={logout}>
          Sign out
        </button>
      </div>

      {loadError ? (
        <div className="card">
          <div className="alert error">{loadError}</div>
          <button onClick={() => router.replace('/login')}>Go to sign in</button>
        </div>
      ) : (
        <div className="stack">
          <BalanceCard balance={balance} catName={catName} />
          <SendTreatsForm onSent={refresh} />
          <TransactionList items={history} />
        </div>
      )}
    </main>
  );
}
