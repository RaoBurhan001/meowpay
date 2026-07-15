'use client';

import { TransferHistoryItem } from '@/lib/api';

/** Renders the caller's transfer history, newest first. */
export function TransactionList({ items }: { items: TransferHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card">
        <h2>Activity</h2>
        <p className="muted">No transfers yet. Send some treats to get started!</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Activity</h2>
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
    </div>
  );
}
