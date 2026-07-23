import type { Tip } from '../types';

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function transferSummary(tip: Tip) {
  const lines: string[] = [];
  if (tip.creditCardTips != null || tip.cashTips != null) {
    lines.push(
      [
        tip.creditCardTips != null ? `CC ${formatCurrency(tip.creditCardTips)}` : null,
        tip.cashTips != null ? `Cash ${formatCurrency(tip.cashTips)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    );
  }
  const groups: [string, Tip['transfers']][] = [
    ['Tips in', tip.transfers.filter((t) => t.kind === 'tip_in')],
    ['Tips out', tip.transfers.filter((t) => t.kind === 'tip_out')],
    ['Owed', tip.transfers.filter((t) => t.kind === 'money_owed')],
  ];
  for (const [label, rows] of groups) {
    if (rows.length === 0) continue;
    lines.push(`${label}: ${rows.map((r) => `${r.name} ${formatCurrency(r.amount)}`).join(', ')}`);
  }
  return lines;
}

function formatDateHeading(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface Props {
  tips: Tip[];
  onDelete: (id: number) => void;
}

export function TipList({ tips, onDelete }: Props) {
  if (tips.length === 0) {
    return <p className="tip-list__empty">No entries yet - add your first one above.</p>;
  }

  const groups = new Map<string, Tip[]>();
  for (const tip of tips) {
    const group = groups.get(tip.date) ?? [];
    group.push(tip);
    groups.set(tip.date, group);
  }

  return (
    <div className="tip-list">
      {[...groups.entries()].map(([date, dayTips]) => (
        <section key={date} className="tip-list__group">
          <h3 className="tip-list__heading">{formatDateHeading(date)}</h3>
          {dayTips.map((tip) => (
            <div key={tip.id} className="tip-card">
              <div className="tip-card__main">
                <span className="tip-card__amount">
                  {formatCurrency(tip.amount)}
                  {tip.category === 'Wages' && <span className="tip-card__badge">Wages</span>}
                  {tip.shiftType != null && (
                    <span className="tip-card__badge">{tip.shiftType === 'bar' ? 'Bar' : 'Floor'}</span>
                  )}
                </span>
                <span className="tip-card__meta">
                  {[tip.source, tip.note].filter(Boolean).join(' · ')}
                </span>
                {tip.shiftType != null &&
                  transferSummary(tip).map((line, i) => (
                    <span className="tip-card__detail" key={i}>
                      {line}
                    </span>
                  ))}
              </div>
              <button
                type="button"
                className="tip-card__delete"
                aria-label="Delete entry"
                onClick={() => {
                  if (confirm('Delete this entry?')) onDelete(tip.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
