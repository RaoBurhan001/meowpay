'use client';

import { TransferHistoryItem } from '@/lib/api';

/**
 * Renders one page of the caller's transfer history, newest first, with
 * Prev/Next pagination. Purely presentational — the parent owns which page is
 * loaded and fetches it from the server (server-side pagination).
 */
export function TransactionList({
  items,
  page,
  totalPages,
  total,
  onPageChange,
}: {
  items: TransferHistoryItem[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) {
    return (
      <div className="card">
        <h2>Activity</h2>
        <p className="muted">No transfers yet. Send some treats to get started!</p>
      </div>
    );
  }

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Activity</h2>
        <span className="muted" style={{ fontSize: 13 }}>{total} total</span>
      </div>

      {items.map((tx) => {
        const sent = tx.direction === 'sent';
        const other = sent ? tx.recipientCatName : tx.senderCatName;
        return (
          <div className="tx" key={tx.id}>
            <div className="tx-left">
              {/* Directional arrow: outgoing (↗) for sent, incoming (↙) for received. */}
              <span
                className={`tx-icon ${sent ? 'sent' : 'received'}`}
                aria-label={sent ? 'sent' : 'received'}
              >
                {sent ? '↗' : '↙'}
              </span>
              <div>
                <div className="who">
                  {sent ? 'Sent to' : 'Received from'} @{other}
                </div>
                <div className="when">{new Date(tx.createdAt).toLocaleString()}</div>
              </div>
            </div>
            <div className={`amt ${sent ? 'sent' : 'received'}`}>
              {sent ? '−' : '+'}
              {tx.amount} treats
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div className="pager">
          <button
            className="btn-ghost"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
          >
            ← Prev
          </button>
          <span className="muted" style={{ fontSize: 13 }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-ghost"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
