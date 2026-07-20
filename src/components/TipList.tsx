import type { Tip } from '../types';

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

function formatDateHeading(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

interface Props {
  tips: Tip[];
  onDelete: (id: number) => void;
}

export function TipList({ tips, onDelete }: Props) {
  if (tips.length === 0) {
    return <p className="tip-list__empty">No tips yet — add your first one above.</p>;
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
                <span className="tip-card__amount">{formatCurrency(tip.amount)}</span>
                {(tip.source || tip.note) && (
                  <span className="tip-card__meta">
                    {[tip.source, tip.note].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="tip-card__delete"
                aria-label="Delete tip"
                onClick={() => {
                  if (confirm('Delete this tip?')) onDelete(tip.id);
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
