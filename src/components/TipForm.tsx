import { useState } from 'react';
import type { IncomeCategory, NameAmount, ShiftType, Tip, TipDraft, VerboseTipDraft } from '../types';
import { NameAmountList } from './NameAmountList';

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

function cleanRows(rows: NameAmount[]): NameAmount[] {
  return rows
    .filter((r) => r.name.trim() !== '' && !Number.isNaN(r.amount))
    .map((r) => ({ name: r.name.trim(), amount: r.amount }));
}

interface Props {
  onSubmit: (draft: TipDraft) => Promise<void>;
  knownSources: string[];
  verboseMode: boolean;
  onSubmitVerbose: (payload: VerboseTipDraft) => Promise<void>;
  // Edit mode: the form prefills from `tip` and saves via `onSave`. The
  // parent remounts the form (via `key`) per edited tip, so initial state is
  // read once here rather than synced in an effect.
  editing?: { tip: Tip; onSave: (tip: Tip) => Promise<void>; onCancel: () => void };
}

export function TipForm({ onSubmit, knownSources, verboseMode, onSubmitVerbose, editing }: Props) {
  const editTip = editing?.tip;
  // Follow the entry being edited, not the account flag - a verbose account
  // editing a legacy plain entry must not have its amount recomputed from
  // empty CC/Cash fields.
  const verbose = editTip ? editTip.shiftType != null : verboseMode;

  const [date, setDate] = useState(editTip?.date ?? defaultDate);
  const [amount, setAmount] = useState(editTip ? String(editTip.amount) : '');
  const [source, setSource] = useState(
    () => editTip?.source ?? localStorage.getItem(LAST_SOURCE_KEY) ?? "Louie's"
  );
  const [category, setCategory] = useState<IncomeCategory>(editTip?.category ?? 'Tips');
  const [note, setNote] = useState(editTip?.note ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [ccTips, setCcTips] = useState(editTip?.creditCardTips?.toString() ?? '');
  const [cashTips, setCashTips] = useState(editTip?.cashTips?.toString() ?? '');
  const [shiftType, setShiftType] = useState<ShiftType | ''>(editTip?.shiftType ?? '');
  const [tipsIn, setTipsIn] = useState<NameAmount[]>([]);
  const [tipsOut, setTipsOut] = useState<NameAmount[]>([]);
  const [moneyOwed, setMoneyOwed] = useState<NameAmount[]>([]);

  const suggestions = knownSources.filter(
    (s) => s.toLowerCase().includes(source.trim().toLowerCase()) && s !== source
  );

  const canSubmit = verbose
    ? date !== '' &&
      source.trim() !== '' &&
      shiftType !== '' &&
      (ccTips === '' || !Number.isNaN(Number(ccTips))) &&
      (cashTips === '' || !Number.isNaN(Number(cashTips)))
    : date !== '' && amount !== '' && !Number.isNaN(Number(amount)) && source.trim() !== '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmedSource = source.trim();
      if (editing) {
        const ccValue = ccTips === '' ? null : Number(ccTips);
        const cashValue = cashTips === '' ? null : Number(cashTips);
        await editing.onSave({
          ...editing.tip,
          date,
          source: trimmedSource,
          category,
          note: note.trim(),
          ...(verbose
            ? {
                creditCardTips: ccValue,
                cashTips: cashValue,
                shiftType: shiftType as ShiftType,
                amount: (ccValue ?? 0) + (cashValue ?? 0),
              }
            : { amount: Number(amount) }),
        });
        return;
      }
      if (verboseMode) {
        await onSubmitVerbose({
          date,
          source: trimmedSource,
          category,
          note: note.trim(),
          creditCardTips: ccTips === '' ? null : Number(ccTips),
          cashTips: cashTips === '' ? null : Number(cashTips),
          shiftType: shiftType as ShiftType,
          tipsIn: cleanRows(tipsIn),
          tipsOut: cleanRows(tipsOut),
          moneyOwed: cleanRows(moneyOwed),
        });
        setCcTips('');
        setCashTips('');
        setShiftType('');
        setTipsIn([]);
        setTipsOut([]);
        setMoneyOwed([]);
      } else {
        await onSubmit({ date, amount: Number(amount), source: trimmedSource, category, note: note.trim() });
        setAmount('');
      }
      localStorage.setItem(LAST_SOURCE_KEY, trimmedSource);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="tip-form" onSubmit={handleSubmit}>
      {verbose ? (
        <>
          <div className="tip-form__money-row">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Credit card $0.00"
              aria-label="Credit card tips"
              value={ccTips}
              onChange={(e) => setCcTips(e.target.value)}
              autoFocus
            />
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="Cash $0.00"
              aria-label="Cash tips"
              value={cashTips}
              onChange={(e) => setCashTips(e.target.value)}
            />
          </div>
          <p className="tip-form__computed-total">
            Total: ${((Number(ccTips) || 0) + (Number(cashTips) || 0)).toFixed(2)}
          </p>

          <div className="tip-form__category">
            {(['bar', 'floor'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={
                  'tip-form__category-option' +
                  (shiftType === option ? ' tip-form__category-option--active' : '')
                }
                onClick={() => setShiftType(option)}
              >
                {option === 'bar' ? 'Bar' : 'Floor'}
              </button>
            ))}
          </div>
        </>
      ) : (
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
      )}

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

      {/* ponytail: transfers aren't editable - updating them atomically needs an
          RPC like create_verbose_tip; add one if fixing a transfer comes up. */}
      {verbose && !editing && (
        <>
          <NameAmountList label="Tips in" rows={tipsIn} onChange={setTipsIn} />
          <NameAmountList label="Tips out" rows={tipsOut} onChange={setTipsOut} />
          <NameAmountList label="Money owed" rows={moneyOwed} onChange={setMoneyOwed} />
        </>
      )}

      {error && <p className="tip-form__error">{error}</p>}

      <button type="submit" className="tip-form__submit" disabled={!canSubmit || submitting}>
        {submitting ? 'Saving…' : editing ? 'Save changes' : `Add ${category === 'Tips' ? 'tip' : 'wage'}`}
      </button>
      {editing && (
        <button type="button" className="tip-form__cancel" onClick={editing.onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
}
