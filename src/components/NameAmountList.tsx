import type { NameAmount } from '../types';

interface Props {
  label: string;
  rows: NameAmount[];
  onChange: (rows: NameAmount[]) => void;
}

export function NameAmountList({ label, rows, onChange }: Props) {
  function updateRow(index: number, patch: Partial<NameAmount>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { name: '', amount: 0 }]);
  }

  return (
    <div className="name-amount-list">
      <span className="name-amount-list__label">{label}</span>
      {rows.map((row, i) => (
        <div className="name-amount-list__row" key={i}>
          <input
            type="text"
            placeholder="Name"
            value={row.name}
            onChange={(e) => updateRow(i, { name: e.target.value })}
            aria-label={`${label} name`}
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={row.amount || ''}
            onChange={(e) => updateRow(i, { amount: Number(e.target.value) })}
            aria-label={`${label} amount`}
          />
          <button
            type="button"
            className="name-amount-list__remove"
            aria-label={`Remove ${label} entry`}
            onClick={() => removeRow(i)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="name-amount-list__add" onClick={addRow}>
        + Add
      </button>
    </div>
  );
}
