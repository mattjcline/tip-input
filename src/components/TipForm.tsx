import { useState } from 'react';
import type { TipDraft } from '../types';

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  onSubmit: (draft: TipDraft) => Promise<void>;
}

export function TipForm({ onSubmit }: Props) {
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = date !== '' && amount !== '' && !Number.isNaN(Number(amount));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ date, amount: Number(amount), source: source.trim(), note: note.trim() });
      setAmount('');
      setSource('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="tip-form" onSubmit={handleSubmit}>
      <div className="tip-form__amount-row">
        <span className="tip-form__currency">$</span>
        <input
          className="tip-form__amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      <div className="tip-form__row">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
        />
        <input
          type="text"
          placeholder="Source (optional)"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          aria-label="Source"
        />
      </div>

      <input
        type="text"
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Note"
      />

      {error && <p className="tip-form__error">{error}</p>}

      <button type="submit" className="tip-form__submit" disabled={!canSubmit || submitting}>
        {submitting ? 'Saving…' : 'Add tip'}
      </button>
    </form>
  );
}
