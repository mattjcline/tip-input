import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { NameAmountList } from './NameAmountList';
import type { NameAmount } from '../types';

// NameAmountList is a pure controlled component (rows come from props, it
// never holds its own state) - wrap it in a stateful harness so tests can
// exercise it the way TipForm actually does.
function Harness({ initialRows = [] as NameAmount[] }) {
  const [rows, setRows] = useState<NameAmount[]>(initialRows);
  return <NameAmountList label="Tips in" rows={rows} onChange={setRows} />;
}

describe('NameAmountList', () => {
  it('adds a new blank row when "+ Add" is clicked', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: '+ Add' }));
    expect(screen.getByLabelText('Tips in name')).toHaveValue('');
    expect(screen.getByLabelText('Tips in amount')).toHaveValue(null);
  });

  it('updates name and amount fields independently', async () => {
    render(<Harness initialRows={[{ name: '', amount: 0 }]} />);
    await userEvent.type(screen.getByLabelText('Tips in name'), 'Jake');
    await userEvent.type(screen.getByLabelText('Tips in amount'), '20');
    expect(screen.getByLabelText('Tips in name')).toHaveValue('Jake');
    expect(screen.getByLabelText('Tips in amount')).toHaveValue(20);
  });

  it('removes a row when its remove button is clicked', async () => {
    render(
      <Harness
        initialRows={[
          { name: 'Jake', amount: 20 },
          { name: 'Maria', amount: 15 },
        ]}
      />
    );
    const removeButtons = screen.getAllByRole('button', { name: 'Remove Tips in entry' });
    await userEvent.click(removeButtons[0]);
    expect(screen.queryByDisplayValue('Jake')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
  });
});
