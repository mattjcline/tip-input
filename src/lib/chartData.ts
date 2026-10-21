import { normalizeSource } from './sources';
import type { IncomeCategory, Tip } from '../types';

export interface TrendPoint {
  key: string;
  label: string;
  total: number;
}

export interface AveragePoint {
  label: string;
  average: number;
  days: number;
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

// Averages are per day worked, not per entry: two Tips entries on one date
// (e.g. a split shift) count as one day. Wages are excluded, like the trend.
function averagePerDay(tips: Tip[], groupOf: (tip: Tip) => string) {
  const daily = new Map<string, { group: string; total: number }>();
  for (const tip of tips) {
    if (tip.category !== 'Tips') continue;
    const group = groupOf(tip);
    const key = `${tip.date}|${group}`;
    const day = daily.get(key) ?? { group, total: 0 };
    day.total += tip.amount;
    daily.set(key, day);
  }

  const sums = new Map<string, { total: number; days: number }>();
  for (const { group, total } of daily.values()) {
    const sum = sums.get(group) ?? { total: 0, days: 0 };
    sum.total += total;
    sum.days++;
    sums.set(group, sum);
  }
  return sums;
}

export function getWeekdayAverages(tips: Tip[]): AveragePoint[] {
  const sums = averagePerDay(tips, (tip) => String(new Date(tip.date + 'T00:00:00').getDay()));
  return Array.from({ length: 7 }, (_, d) => {
    const sum = sums.get(String(d));
    return {
      // Jan 4 2026 is a Sunday, so +d walks Sun..Sat in the user's locale.
      label: new Date(2026, 0, 4 + d).toLocaleDateString(undefined, { weekday: 'short' }),
      average: sum ? sum.total / sum.days : 0,
      days: sum?.days ?? 0,
    };
  });
}

export function getSourceAverages(tips: Tip[]): AveragePoint[] {
  const sums = averagePerDay(tips, (tip) => normalizeSource(tip.source.trim()));
  return [...sums.entries()]
    .filter(([source]) => source !== '')
    .map(([label, { total, days }]) => ({ label, average: total / days, days }))
    .sort((a, b) => b.average - a.average);
}
