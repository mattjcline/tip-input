import type { IncomeCategory, Tip } from '../types';

export interface TrendPoint {
  key: string;
  label: string;
  total: number;
}

export interface CategoryBreakdown {
  category: IncomeCategory;
  total: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

function monthLabel(year: number, month: number, opts: Intl.DateTimeFormatOptions) {
  return new Date(year, month - 1).toLocaleDateString(undefined, opts);
}

// Buckets follow the TipList date filter: '' (all time) -> monthly from the
// first tip to now, 'YYYY' -> Jan-Dec of that year, 'YYYY-MM' -> each day of
// that month. Bucket keys are prefixes of a tip's 'YYYY-MM-DD' date, so a tip
// lands in a bucket by plain string slicing - no Date parsing/timezone drift.
export function getTrend(tips: Tip[], dateFilter: string, now = new Date()): TrendPoint[] {
  const buckets: TrendPoint[] = [];

  if (dateFilter.length === 7) {
    const [y, m] = dateFilter.split('-').map(Number);
    const days = new Date(y, m, 0).getDate();
    for (let d = 1; d <= days; d++) {
      buckets.push({ key: `${dateFilter}-${pad(d)}`, label: String(d), total: 0 });
    }
  } else if (dateFilter.length === 4) {
    const y = Number(dateFilter);
    for (let m = 1; m <= 12; m++) {
      buckets.push({ key: `${dateFilter}-${pad(m)}`, label: monthLabel(y, m, { month: 'short' }), total: 0 });
    }
  } else {
    const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const firstKey = tips.reduce((min, t) => (t.date.slice(0, 7) < min ? t.date.slice(0, 7) : min), nowKey);
    let [y, m] = firstKey.split('-').map(Number);
    for (let key = firstKey; key <= nowKey; key = `${y}-${pad(m)}`) {
      buckets.push({ key, label: monthLabel(y, m, { month: 'short', year: '2-digit' }), total: 0 });
      if (++m > 12) {
        m = 1;
        y++;
      }
    }
  }

  const byKey = new Map(buckets.map((b) => [b.key, b]));
  const keyLength = buckets[0].key.length;
  for (const tip of tips) {
    if (tip.category !== 'Tips') continue;
    const bucket = byKey.get(tip.date.slice(0, keyLength));
    if (bucket) bucket.total += tip.amount;
  }

  return buckets;
}

export function getCategoryBreakdown(tips: Tip[]): CategoryBreakdown[] {
  const totals: Record<IncomeCategory, number> = { Tips: 0, Wages: 0 };
  for (const tip of tips) totals[tip.category] += tip.amount;

  return [
    { category: 'Tips', total: totals.Tips },
    { category: 'Wages', total: totals.Wages },
  ];
}
