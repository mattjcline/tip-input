import { useState } from 'react';
import type { IncomeCategory, TipDraft } from '../types';

const LAST_SOURCE_KEY = 'tip-input:last-source';

function toLocalDateString(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Late-night entries (12am-6am) usually belong to the shift that started the
// previous evening, so default to yesterday's date during that window.
function defaultDate() {
  const now = new Date();
  if (now.getHours() < 6) {
    now.setDate(now.getDate() - 1);
  }
  return toLocalDateString(now);
}

interface Props {
  onSubmit: (draft: TipDraft) => Promise<void>;
  knownSources: string[];
}

export function TipForm({ onSubmit, knownSources }: Props) {
  const [date, setDate] = useState(defaultDate);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(
    () => localStorage.getItem(LAST_SOURCE_KEY) ?? "Louie's"
  );
  const [category, setCategory] = useState<IncomeCategory>('Tips');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = knownSources.filter(
    (s) => s.toLowerCase().includes(source.trim().toLowerCase()) && s !== source
  );

  const canSubmit = date !== '' && amount !== '' && !Number.isNaN(Number(amount)) && source.trim() !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmedSource = source.trim();
      await onSubmit({ date, amount: Number(amount), source: trimmedSource, category, note: note.trim() });
      localStorage.setItem(LAST_SOURCE_KEY, trimmedSource);
      setAmount('');
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

      <div className="tip-form__category">
        {(['Tips', 'Wages'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={
              'tip-form__category-option' +
              (category === option ? ' tip-form__category-option--active' : '')
            }
            onClick={() => setCategory(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="tip-form__row">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date"
        />
        <div className="tip-form__autocomplete">
          <input
            type="text"
            placeholder="Source (bar)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            aria-label="Source"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="tip-form__suggestions">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onClick={() => setSource(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
        {submitting ? 'Saving…' : `Add ${category === 'Tips' ? 'tip' : 'wage'}`}
      </button>
    </form>
  );
}
