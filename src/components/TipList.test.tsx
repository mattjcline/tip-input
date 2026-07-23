import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TipList } from './TipList';
import type { Tip } from '../types';

function makeTip(overrides: Partial<Tip> = {}): Tip {
  return {
    id: 1,
    date: '2026-07-21',
    source: "Louie's",
    amount: 100,
    category: 'Tips',
    note: '',
    creditCardTips: null,
    cashTips: null,
    shiftType: null,
    transfers: [],
    ...overrides,
  };
}

function expectedHeading(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

describe('TipList', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows an empty-state message when there are no tips', () => {
    render(<TipList tips={[]} onDelete={vi.fn()} />);
    expect(screen.getByText(/no entries yet/i)).toBeInTheDocument();
  });

  it('formats amount as currency and includes the year in the date heading', () => {
    render(<TipList tips={[makeTip({ date: '2025-01-15', amount: 42.5 })]} onDelete={vi.fn()} />);
    expect(screen.getByText('$42.50')).toBeInTheDocument();
    expect(screen.getByText(expectedHeading('2025-01-15'))).toBeInTheDocument();
  });

  it('shows a Wages badge only for Wages entries', () => {
    const { rerender } = render(<TipList tips={[makeTip({ category: 'Tips' })]} onDelete={vi.fn()} />);
    expect(screen.queryByText('Wages')).not.toBeInTheDocument();

    rerender(<TipList tips={[makeTip({ category: 'Wages' })]} onDelete={vi.fn()} />);
    expect(screen.getByText('Wages')).toBeInTheDocument();
  });

  it('shows no shift/transfer detail for a non-verbose (legacy) entry', () => {
    render(<TipList tips={[makeTip()]} onDelete={vi.fn()} />);
    expect(screen.queryByText('Bar')).not.toBeInTheDocument();
    expect(screen.queryByText('Floor')).not.toBeInTheDocument();
    expect(screen.queryByText(/CC \$/)).not.toBeInTheDocument();
  });

  it('shows shift type badge and transfer summary for a verbose entry', () => {
    render(
      <TipList
        tips={[
          makeTip({
            shiftType: 'bar',
            creditCardTips: 30,
            cashTips: 10,
            transfers: [
              { id: 1, kind: 'tip_in', name: 'Jake', amount: 20 },
              { id: 2, kind: 'money_owed', name: 'Priya', amount: 5 },
            ],
          }),
        ]}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('CC $30.00 · Cash $10.00')).toBeInTheDocument();
    expect(screen.getByText('Tips in: Jake $20.00')).toBeInTheDocument();
    expect(screen.getByText('Owed: Priya $5.00')).toBeInTheDocument();
  });

  it('calls onDelete after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const onDelete = vi.fn();
    render(<TipList tips={[makeTip({ id: 7 })]} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    expect(onDelete).toHaveBeenCalledWith(7);
  });

  it('does not call onDelete when confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const onDelete = vi.fn();
    render(<TipList tips={[makeTip({ id: 7 })]} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete entry' }));
    expect(onDelete).not.toHaveBeenCalled();
  });
});
