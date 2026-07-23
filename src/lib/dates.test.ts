import { describe, expect, it } from 'vitest';
import { startOfWeek } from './dates';

describe('startOfWeek', () => {
  it('returns a Sunday input at midnight', () => {
    const sunday = new Date(2026, 5, 7, 15, 30); // Sun Jun 7 2026, 3:30pm
    const result = startOfWeek(sunday);
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(7);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it('returns the preceding Sunday for a Saturday input', () => {
    const saturday = new Date(2026, 5, 13, 9, 0); // Sat Jun 13 2026
    const result = startOfWeek(saturday);
    expect(result.getDay()).toBe(0);
    expect(result.getDate()).toBe(7);
    expect(result.getMonth()).toBe(5);
  });

  it('does not mutate its argument', () => {
    const input = new Date(2026, 5, 10, 12, 0);
    const copy = new Date(input);
    startOfWeek(input);
    expect(input).toEqual(copy);
  });

  it('crosses a month boundary correctly', () => {
    const wednesday = new Date(2026, 6, 1, 12, 0); // Wed Jul 1 2026
    const result = startOfWeek(wednesday);
    expect(result.getMonth()).toBe(5); // June
    expect(result.getDate()).toBe(28);
    expect(result.getDay()).toBe(0);
  });
});
