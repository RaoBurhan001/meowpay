'use client';

/** Presentational balance display. Data is owned by the dashboard page. */
export function BalanceCard({ balance, catName }: { balance: number | null; catName: string }) {
  return (
    <div className="card">
      <h2>Your treats</h2>
      <div className="balance-amount">
        {balance === null ? '…' : balance.toLocaleString()} <small>treats</small>
      </div>
      <p className="muted">Signed in as @{catName}</p>
    </div>
  );
}
