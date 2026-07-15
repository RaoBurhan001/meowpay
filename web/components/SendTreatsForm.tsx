'use client';

import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/lib/api';

/**
 * The "send treats" form.
 *
 * Idempotency: a key is generated once per logical send and kept stable across
 * retries (a double-click or a retry after a flaky network reuses the SAME
 * key, so the backend will not move treats twice). The key is only rotated
 * after a confirmed success, when the next send is genuinely a new one.
 */
export function SendTreatsForm({ onSent }: { onSent: () => void }) {
  const [recipientCatName, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.sendTreats({
        recipientCatName: recipientCatName.trim(),
        amount: Number(amount),
        idempotencyKey,
      });
      setSuccess(`Sent ${amount} treats to @${recipientCatName.trim()}!`);
      setRecipient('');
      setAmount('');
      setKey(crypto.randomUUID()); // fresh key: the next send is a new one
      onSent(); // let the dashboard refresh balance + history
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Send treats</h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="recipient">Recipient handle</label>
        <input
          id="recipient"
          value={recipientCatName}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="mittens"
          required
        />

        <label htmlFor="amount">Amount (treats)</label>
        <input
          id="amount"
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="50"
          required
        />

        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send treats'}
        </button>
      </form>
    </div>
  );
}
