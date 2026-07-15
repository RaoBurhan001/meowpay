'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { api, ApiError, CatSummary } from '@/lib/api';

/**
 * The "send treats" form.
 *
 * Idempotency: a key is generated once per logical send and kept stable across
 * retries (a double-click or a retry after a flaky network reuses the SAME
 * key, so the backend will not move treats twice). The key is only rotated
 * after a confirmed success, when the next send is genuinely a new one.
 *
 * Two convenience features help pick a recipient:
 *  - a live autocomplete dropdown that searches cats by handle as you type;
 *  - "recent recipients" chips (cats you've sent to before) for one-click reuse.
 */
export function SendTreatsForm({
  recentRecipients = [],
  onSent,
}: {
  recentRecipients?: CatSummary[];
  onSent: () => void;
}) {
  const [recipientCatName, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setKey] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Autocomplete state.
  const [suggestions, setSuggestions] = useState<CatSummary[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const skipNextSearch = useRef(false); // don't re-search right after a pick
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced recipient search. Re-runs whenever the typed name changes.
  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = recipientCatName.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchRecipients(q);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [recipientCatName]);

  // Close the dropdown when clicking outside the input group.
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function pick(catName: string) {
    skipNextSearch.current = true;
    setRecipient(catName);
    setShowSuggestions(false);
    setSuggestions([]);
  }

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

      {recentRecipients.length > 0 && (
        <div className="recents">
          <span className="muted" style={{ fontSize: 12 }}>Recent:</span>
          <div className="chips">
            {recentRecipients.map((r) => (
              <button
                type="button"
                key={r.catName}
                className="chip"
                onClick={() => pick(r.catName)}
                title={`Send to @${r.catName}`}
              >
                🐱 @{r.catName}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <label htmlFor="recipient">Recipient handle</label>
        <div className="autocomplete" ref={boxRef}>
          <input
            id="recipient"
            value={recipientCatName}
            onChange={(e) => setRecipient(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="start typing… e.g. whisker"
            autoComplete="off"
            required
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions">
              {suggestions.map((s) => (
                <li key={s.catName}>
                  <button type="button" className="suggestion" onClick={() => pick(s.catName)}>
                    <span className="who">@{s.catName}</span>
                    <span className="muted">{s.displayName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
