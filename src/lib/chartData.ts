import { startOfWeek } from './dates';
import type { IncomeCategory, Tip } from '../types';

export interface WeeklyTrendPoint {
  weekStart: string;
  label: string;
  total: number;
}

export interface CategoryBreakdown {
  category: IncomeCategory;
  total: number;
}

function toDateOnly(dateStr: string) {
  return new Date(dateStr + 'T00:00:00');
}

// Local calendar-date key, not toISOString() - that converts to UTC and can
// shift the date for timezones ahead of UTC, the same drift the rest of the
// app avoids by parsing/formatting dates in local time (see TipList).
function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatWeekLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function getWeeklyTrend(tips: Tip[], weeks = 12, now = new Date()): WeeklyTrendPoint[] {
  const currentWeekStart = startOfWeek(now);
  const buckets: WeeklyTrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    buckets.push({ weekStart: toDateKey(weekStart), label: formatWeekLabel(weekStart), total: 0 });
  }

  const byWeekStart = new Map(buckets.map((b) => [b.weekStart, b]));
  for (const tip of tips) {
    if (tip.category !== 'Tips') continue;
    const weekStart = toDateKey(startOfWeek(toDateOnly(tip.date)));
    const bucket = byWeekStart.get(weekStart);
    if (bucket) bucket.total += tip.amount;
  }

  return buckets;
}

export function getMonthlyCategoryBreakdown(tips: Tip[], now = new Date()): CategoryBreakdown[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totals: Record<IncomeCategory, number> = { Tips: 0, Wages: 0 };

  for (const tip of tips) {
    const date = toDateOnly(tip.date);
    if (date >= monthStart) totals[tip.category] += tip.amount;
  }

  return [
    { category: 'Tips', total: totals.Tips },
    { category: 'Wages', total: totals.Wages },
  ];
}
