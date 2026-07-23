import { useState } from 'react';
import { startOfWeek } from '../lib/dates';
import type { Tip } from '../types';

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

interface Props {
  tips: Tip[];
}

export function SummaryBar({ tips }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  let weekTotal = 0;
  let monthTotal = 0;
  let yearTotal = 0;

  for (const tip of tips) {
    if (tip.category !== 'Tips') continue;
    const date = new Date(tip.date + 'T00:00:00');
    if (date >= yearStart) yearTotal += tip.amount;
    if (date >= monthStart) monthTotal += tip.amount;
    if (date >= weekStart) weekTotal += tip.amount;
  }

  const stats = [
    { key: 'week', label: 'This week', total: weekTotal },
    { key: 'month', label: 'This month', total: monthTotal },
    { key: 'year', label: 'YTD', total: yearTotal },
  ];

  function toggle(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="summary-bar">
      {stats.map(({ key, label, total }) => {
        const isRevealed = revealed.has(key);
        return (
          <button
            key={key}
            type="button"
            className="summary-bar__stat"
            onClick={() => toggle(key)}
            aria-pressed={isRevealed}
            aria-label={`${label}: ${isRevealed ? formatCurrency(total) : 'hidden, tap to reveal'}`}
          >
            <span className="summary-bar__label">{label}</span>
            <span className={'summary-bar__value' + (isRevealed ? '' : ' summary-bar__value--blurred')}>
              {formatCurrency(total)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
