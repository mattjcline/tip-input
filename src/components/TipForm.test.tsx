import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TipForm } from './TipForm';

function renderForm(verboseMode: boolean, overrides: Partial<Parameters<typeof TipForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onSubmitVerbose = vi.fn().mockResolvedValue(undefined);
  render(
    <TipForm
      onSubmit={onSubmit}
      onSubmitVerbose={onSubmitVerbose}
      knownSources={[]}
      verboseMode={verboseMode}
      {...overrides}
    />
  );
  return { onSubmit, onSubmitVerbose };
}

describe('TipForm', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-07-22T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults the date to today when it is after 6am', () => {
    vi.setSystemTime(new Date('2026-07-22T12:00:00'));
    renderForm(false);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-22');
  });

  it('defaults the date to yesterday between midnight and 6am', () => {
    vi.setSystemTime(new Date('2026-07-22T03:00:00'));
    renderForm(false);
    expect(screen.getByLabelText('Date')).toHaveValue('2026-07-21');
  });

  describe('non-verbose mode (the app owner\'s unchanged experience)', () => {
    it('shows only the simple amount field, never any verbose-only fields', () => {
      renderForm(false);
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
      expect(screen.queryByLabelText('Credit card tips')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Cash tips')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Bar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Floor' })).not.toBeInTheDocument();
      expect(screen.queryByText('Tips in')).not.toBeInTheDocument();
    });

    it('disables submit until date, amount, and source are all present', async () => {
      renderForm(false);
      const submit = screen.getByRole('button', { name: /add tip/i });
      expect(submit).toBeDisabled();

      await userEvent.type(screen.getByPlaceholderText('0.00'), '25');
      expect(submit).toBeEnabled(); // source defaults to "Louie's", date defaults to today
    });

    it('submits the expected draft shape and clears the amount afterward', async () => {
      const { onSubmit } = renderForm(false);
      await userEvent.type(screen.getByPlaceholderText('0.00'), '25.50');
      await userEvent.click(screen.getByRole('button', { name: /add tip/i }));

      expect(onSubmit).toHaveBeenCalledWith({
        date: '2026-07-22',
        amount: 25.5,
        source: "Louie's",
        category: 'Tips',
        note: '',
      });
      expect(screen.getByPlaceholderText('0.00')).toHaveValue(null);
    });
  });

  describe('verbose mode', () => {
    it('shows CC/Cash, shift type, and the three transfer lists instead of the simple amount field', () => {
      renderForm(true);
      expect(screen.queryByPlaceholderText('0.00')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Credit card tips')).toBeInTheDocument();
      expect(screen.getByLabelText('Cash tips')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Bar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Floor' })).toBeInTheDocument();
      expect(screen.getByText('Tips in')).toBeInTheDocument();
      expect(screen.getByText('Tips out')).toBeInTheDocument();
      expect(screen.getByText('Money owed')).toBeInTheDocument();
    });

    it('requires a shift type to be picked before submitting', async () => {
      renderForm(true);
      const submit = screen.getByRole('button', { name: /add tip/i });
      expect(submit).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: 'Bar' }));
      expect(submit).toBeEnabled();
    });

    it('submits the computed total and filters out blank transfer rows', async () => {
      const { onSubmitVerbose } = renderForm(true);

      await userEvent.type(screen.getByLabelText('Credit card tips'), '30');
      await userEvent.type(screen.getByLabelText('Cash tips'), '10');
      await userEvent.click(screen.getByRole('button', { name: 'Bar' }));

      // One filled-in "Tips in" row, plus a second left entirely blank.
      await userEvent.click(screen.getAllByRole('button', { name: '+ Add' })[0]);
      await userEvent.type(screen.getByLabelText('Tips in name'), 'Jake');
      await userEvent.type(screen.getByLabelText('Tips in amount'), '20');
      await userEvent.click(screen.getAllByRole('button', { name: '+ Add' })[0]);

      await userEvent.click(screen.getByRole('button', { name: /add tip/i }));

      expect(onSubmitVerbose).toHaveBeenCalledWith({
        date: '2026-07-22',
        source: "Louie's",
        category: 'Tips',
        note: '',
        creditCardTips: 30,
        cashTips: 10,
        shiftType: 'bar',
        tipsIn: [{ name: 'Jake', amount: 20 }],
        tipsOut: [],
        moneyOwed: [],
      });
    });
  });
});
