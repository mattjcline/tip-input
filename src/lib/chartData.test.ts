import { describe, expect, it } from 'vitest';
import { getCategoryBreakdown, getSourceAverages, getTrend, getWeekdayAverages } from './chartData';
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

describe('getTrend', () => {
  const now = new Date(2026, 6, 1, 12, 0); // Jul 1 2026

  it('month filter: one bucket per day of that month', () => {
    const tips = [
      makeTip({ date: '2026-02-01', amount: 10, category: 'Tips' }),
      makeTip({ date: '2026-02-28', amount: 5, category: 'Tips' }),
      makeTip({ date: '2026-03-01', amount: 99, category: 'Tips' }), // outside month
    ];
    const result = getTrend(tips, '2026-02', now);
    expect(result).toHaveLength(28);
    expect(result[0]).toMatchObject({ key: '2026-02-01', label: '1', total: 10 });
    expect(result[27]).toMatchObject({ key: '2026-02-28', total: 5 });
  });

  it('year filter: twelve monthly buckets', () => {
    const tips = [
      makeTip({ date: '2025-01-15', amount: 10, category: 'Tips' }),
      makeTip({ date: '2025-01-20', amount: 5, category: 'Tips' }),
      makeTip({ date: '2025-12-31', amount: 7, category: 'Tips' }),
      makeTip({ date: '2026-01-01', amount: 99, category: 'Tips' }), // outside year
    ];
    const result = getTrend(tips, '2025', now);
    expect(result.map((b) => b.key)).toEqual([
      '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
      '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
    ]);
    expect(result[0].total).toBe(15);
    expect(result[11].total).toBe(7);
  });

  it('all time: monthly from the first tip through the current month, across years', () => {
    const tips = [
      makeTip({ date: '2025-11-03', amount: 10, category: 'Tips' }),
      makeTip({ date: '2026-07-01', amount: 4, category: 'Tips' }),
    ];
    const result = getTrend(tips, '', now);
    expect(result.map((b) => b.key)).toEqual([
      '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
    ]);
    expect(result[0].total).toBe(10);
    expect(result[8].total).toBe(4);
  });

  it('all time with no tips: just the current month', () => {
    const result = getTrend([], '', now);
    expect(result).toEqual([expect.objectContaining({ key: '2026-07', total: 0 })]);
  });

  it('excludes Wages entries', () => {
    const tips = [makeTip({ date: '2026-02-10', amount: 100, category: 'Wages' })];
    expect(getTrend(tips, '2026-02', now).every((b) => b.total === 0)).toBe(true);
  });
});

describe('getCategoryBreakdown', () => {
  it('sums each category over the given tips', () => {
    const tips = [
      makeTip({ date: '2026-06-01', amount: 50, category: 'Tips' }),
      makeTip({ date: '2025-01-14', amount: 25, category: 'Tips' }),
      makeTip({ date: '2026-06-10', amount: 200, category: 'Wages' }),
    ];
    expect(getCategoryBreakdown(tips)).toEqual([
      { category: 'Tips', total: 75 },
      { category: 'Wages', total: 200 },
    ]);
  });

  it('returns both categories at 0 for empty input', () => {
    expect(getCategoryBreakdown([])).toEqual([
      { category: 'Tips', total: 0 },
      { category: 'Wages', total: 0 },
    ]);
  });
});

describe('getWeekdayAverages', () => {
  it('averages per day worked, combining same-day entries, Sun..Sat', () => {
    const tips = [
      makeTip({ date: '2026-07-03', amount: 100, category: 'Tips' }), // Fri
      makeTip({ date: '2026-07-03', amount: 50, category: 'Tips' }), // same Fri - one day
      makeTip({ date: '2026-07-10', amount: 50, category: 'Tips' }), // Fri
      makeTip({ date: '2026-07-10', amount: 500, category: 'Wages' }), // excluded
    ];
    const result = getWeekdayAverages(tips);
    expect(result).toHaveLength(7);
    expect(result[5]).toMatchObject({ average: 100, days: 2 });
    expect(result[0]).toMatchObject({ average: 0, days: 0 });
  });
});

describe('getSourceAverages', () => {
  it('averages per day per source, merges curly apostrophes, sorts best first', () => {
    const tips = [
      makeTip({ date: '2026-07-01', amount: 100, category: 'Tips', source: "Louie's" }),
      makeTip({ date: '2026-07-02', amount: 200, category: 'Tips', source: 'Louie’s' }),
      makeTip({ date: '2026-07-01', amount: 300, category: 'Tips', source: 'Rex' }),
      makeTip({ date: '2026-07-04', amount: 10, category: 'Tips', source: '' }), // no source, skipped
    ];
    expect(getSourceAverages(tips)).toEqual([
      { label: 'Rex', average: 300, days: 1 },
      { label: "Louie's", average: 150, days: 2 },
    ]);
  });
});
