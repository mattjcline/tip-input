import type { Tip } from '../types';

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

interface Props {
  tips: Tip[];
}

export function SummaryBar({ tips }: Props) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let weekTotal = 0;
  let monthTotal = 0;
  let allTotal = 0;

  for (const tip of tips) {
    const date = new Date(tip.date + 'T00:00:00');
    allTotal += tip.amount;
    if (date >= monthStart) monthTotal += tip.amount;
    if (date >= weekStart) weekTotal += tip.amount;
  }

  return (
    <div className="summary-bar">
      <div className="summary-bar__stat">
        <span className="summary-bar__label">This week</span>
        <span className="summary-bar__value">{formatCurrency(weekTotal)}</span>
      </div>
      <div className="summary-bar__stat">
        <span className="summary-bar__label">This month</span>
        <span className="summary-bar__value">{formatCurrency(monthTotal)}</span>
      </div>
      <div className="summary-bar__stat">
        <span className="summary-bar__label">All time</span>
        <span className="summary-bar__value">{formatCurrency(allTotal)}</span>
      </div>
    </div>
  );
}
