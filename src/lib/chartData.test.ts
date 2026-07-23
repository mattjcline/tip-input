import { describe, expect, it } from 'vitest';
import { getMonthlyCategoryBreakdown, getWeeklyTrend } from './chartData';
import type { Tip } from '../types';

function makeTip(overrides: Partial<Tip> & Pick<Tip, 'date' | 'amount' | 'category'>): Tip {
  return {
    id: 1,
    source: 'Test Bar',
    note: '',
    creditCardTips: null,
    cashTips: null,
    shiftType: null,
    transfers: [],
    ...overrides,
  };
}

describe('getWeeklyTrend', () => {
  const now = new Date(2026, 6, 1, 12, 0); // Wed Jul 1 2026 - partial current week

  it('buckets by week, oldest first, ending at the current partial week', () => {
    const result = getWeeklyTrend([], 3, now);
    expect(result.map((b) => b.weekStart)).toEqual(['2026-06-14', '2026-06-21', '2026-06-28']);
  });

  it('assigns a tip to the correct week bucket', () => {
    const tips = [makeTip({ date: '2026-06-15', amount: 10, category: 'Tips' })];
    const result = getWeeklyTrend(tips, 3, now);
    expect(result.find((b) => b.weekStart === '2026-06-14')!.total).toBe(10);
  });

  it('assigns a tip dated exactly on a week-start boundary to that week', () => {
    const tips = [makeTip({ date: '2026-06-28', amount: 5, category: 'Tips' })];
    const result = getWeeklyTrend(tips, 3, now);
    expect(result.find((b) => b.weekStart === '2026-06-28')!.total).toBe(5);
    expect(result.find((b) => b.weekStart === '2026-06-21')!.total).toBe(0);
  });

  it('includes the current partial week', () => {
    const tips = [makeTip({ date: '2026-07-01', amount: 7, category: 'Tips' })];
    const result = getWeeklyTrend(tips, 3, now);
    expect(result.find((b) => b.weekStart === '2026-06-28')!.total).toBe(7);
  });

  it('excludes Wages entries', () => {
    const tips = [makeTip({ date: '2026-06-15', amount: 100, category: 'Wages' })];
    const result = getWeeklyTrend(tips, 3, now);
    expect(result.every((b) => b.total === 0)).toBe(true);
  });

  it('returns all-zero buckets for empty input', () => {
    const result = getWeeklyTrend([], 3, now);
    expect(result.every((b) => b.total === 0)).toBe(true);
    expect(result).toHaveLength(3);
  });
});

describe('getMonthlyCategoryBreakdown', () => {
  const now = new Date(2026, 5, 15, 12, 0); // Jun 15 2026

  it('sums each category for the current calendar month only', () => {
    const tips = [
      makeTip({ date: '2026-06-01', amount: 50, category: 'Tips' }),
      makeTip({ date: '2026-06-14', amount: 25, category: 'Tips' }),
      makeTip({ date: '2026-06-10', amount: 200, category: 'Wages' }),
      makeTip({ date: '2026-05-31', amount: 999, category: 'Tips' }), // previous month, excluded
    ];
    const result = getMonthlyCategoryBreakdown(tips, now);
    expect(result).toEqual([
      { category: 'Tips', total: 75 },
      { category: 'Wages', total: 200 },
    ]);
  });

  it('returns both categories at 0 when there are no tips this month', () => {
    const result = getMonthlyCategoryBreakdown([], now);
    expect(result).toEqual([
      { category: 'Tips', total: 0 },
      { category: 'Wages', total: 0 },
    ]);
  });

  it('includes a tip dated on the first day of the month', () => {
    const tips = [makeTip({ date: '2026-06-01', amount: 42, category: 'Tips' })];
    const result = getMonthlyCategoryBreakdown(tips, now);
    expect(result.find((b) => b.category === 'Tips')!.total).toBe(42);
  });
});
