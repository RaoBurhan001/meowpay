'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, CatSummary, PaginatedTransfers } from '@/lib/api';
import { clearSession, getToken, getUser } from '@/lib/auth';
import { BalanceCard } from '@/components/BalanceCard';
import { SendTreatsForm } from '@/components/SendTreatsForm';
import { TransactionList } from '@/components/TransactionList';

/** Activity page size — matches the backend default. */
const HISTORY_LIMIT = 5;

/**
 * The main screen. Owns the live data (balance + paginated history) and
 * re-fetches it from the real backend after every send, so the numbers a user
 * sees are never optimistic local state.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [catName, setCatName] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [historyData, setHistoryData] = useState<PaginatedTransfers | null>(null);
  const [recent, setRecent] = useState<CatSummary[]>([]);
  const [loadError, setLoadError] = useState('');

  // Fetch one page of history. Recent-recipient chips are derived from page 1
  // (the newest transfers) and left untouched while browsing later pages, so
  // paging through history doesn't churn the quick-send list.
  const loadHistory = useCallback(async (page: number) => {
    const data = await api.getHistory(page, HISTORY_LIMIT);
    setHistoryData(data);
    if (data.page === 1) {
      const seen = new Set<string>();
      const list: CatSummary[] = [];
      for (const tx of data.items) {
        if (tx.direction === 'sent' && !seen.has(tx.recipientCatName)) {
          seen.add(tx.recipientCatName);
          list.push({ catName: tx.recipientCatName, displayName: tx.recipientCatName });
        }
      }
      setRecent(list);
    }
  }, []);

  // Refresh balance + jump back to the newest page (a new send lands there).
  const refresh = useCallback(async () => {
    try {
      const b = await api.getBalance();
      setBalance(b.balance);
      setCatName(b.catName);
      await loadHistory(1);
    } catch {
      setLoadError('Your session expired. Please sign in again.');
    }
  }, [loadHistory]);

  const changePage = useCallback(
    async (page: number) => {
      try {
        await loadHistory(page);
      } catch {
        setLoadError('Your session expired. Please sign in again.');
      }
    },
    [loadHistory],
  );

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
        <button className="btn-ghost" onClick={logout}>
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
          <SendTreatsForm recentRecipients={recent} onSent={refresh} />
          <TransactionList
            items={historyData?.items ?? []}
            page={historyData?.page ?? 1}
            totalPages={historyData?.totalPages ?? 0}
            total={historyData?.total ?? 0}
            onPageChange={changePage}
          />
        </div>
      )}
    </main>
  );
}
