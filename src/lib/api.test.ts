import { describe, expect, it, vi } from 'vitest';
import { addTip, addVerboseTip, deleteTip, fetchTips, updateTip } from './api';

// A chainable stand-in for supabase-js's PostgrestFilterBuilder: every
// query-building method returns the same object, and it resolves to
// `result` whether the caller ends the chain with .single() or just
// awaits the builder directly (fetchTips/deleteTip don't call .single()).
function makeQuery(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn((..._args: unknown[]) => query),
    order: vi.fn((..._args: unknown[]) => query),
    eq: vi.fn((..._args: unknown[]) => query),
    insert: vi.fn((..._args: unknown[]) => query),
    update: vi.fn((..._args: unknown[]) => query),
    delete: vi.fn((..._args: unknown[]) => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
}

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock('./supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

const rawRow = {
  id: 1,
  date: '2026-07-21',
  source: "Louie's",
  amount: '123.45', // PostgREST returns numeric columns as strings
  category: 'Tips',
  note: '',
  credit_card_tips: '80.00',
  cash_tips: '43.45',
  shift_type: 'bar',
  transfers: [{ id: 5, kind: 'tip_in', name: 'Jake', amount: '20.00' }],
};

describe('api', () => {
  it('fetchTips coerces numeric-string columns (including nested transfers) back to numbers', async () => {
    fromMock.mockReturnValue(makeQuery({ data: [rawRow], error: null }));

    const tips = await fetchTips();

    expect(tips).toEqual([
      {
        id: 1,
        date: '2026-07-21',
        source: "Louie's",
        amount: 123.45,
        category: 'Tips',
        note: '',
        creditCardTips: 80,
        cashTips: 43.45,
        shiftType: 'bar',
        transfers: [{ id: 5, kind: 'tip_in', name: 'Jake', amount: 20 }],
      },
    ]);
  });

  it('fetchTips defaults transfers to [] and CC/cash/shiftType to null for legacy rows', async () => {
    fromMock.mockReturnValue(
      makeQuery({
        data: [{ ...rawRow, credit_card_tips: null, cash_tips: null, shift_type: null, transfers: [] }],
        error: null,
      })
    );

    const [tip] = await fetchTips();

    expect(tip.creditCardTips).toBeNull();
    expect(tip.cashTips).toBeNull();
    expect(tip.shiftType).toBeNull();
    expect(tip.transfers).toEqual([]);
  });

  it('fetchTips throws on a Postgrest error', async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: 'boom' } }));
    await expect(fetchTips()).rejects.toThrow('boom');
  });

  it('addTip sends null for unset credit_card_tips/cash_tips/shift_type', async () => {
    const query = makeQuery({ data: rawRow, error: null });
    fromMock.mockReturnValue(query);

    await addTip({ date: '2026-07-21', source: "Louie's", amount: 25, category: 'Tips', note: '' });

    expect(query.insert).toHaveBeenCalledWith({
      date: '2026-07-21',
      source: "Louie's",
      amount: 25,
      category: 'Tips',
      note: '',
      credit_card_tips: null,
      cash_tips: null,
      shift_type: null,
    });
  });

  it('updateTip does not send the virtual transfers field back as a column', async () => {
    const query = makeQuery({ data: rawRow, error: null });
    fromMock.mockReturnValue(query);

    await updateTip({
      id: 1,
      date: '2026-07-21',
      source: "Louie's",
      amount: 25,
      category: 'Tips',
      note: '',
      creditCardTips: null,
      cashTips: null,
      shiftType: null,
      transfers: [{ id: 5, kind: 'tip_in', name: 'Jake', amount: 20 }],
    });

    const sentPayload = query.update.mock.calls[0][0];
    expect(sentPayload).not.toHaveProperty('transfers');
    expect(sentPayload).not.toHaveProperty('id');
    expect(query.eq).toHaveBeenCalledWith('id', 1);
  });

  it('deleteTip throws on a Postgrest error', async () => {
    fromMock.mockReturnValue(makeQuery({ data: null, error: { message: 'nope' } }));
    await expect(deleteTip(1)).rejects.toThrow('nope');
  });

  it('addVerboseTip calls the RPC then re-fetches the full hydrated row', async () => {
    rpcMock.mockReturnValue(Promise.resolve({ data: { id: 42 }, error: null }));
    fromMock.mockReturnValue(makeQuery({ data: { ...rawRow, id: 42 }, error: null }));

    const tip = await addVerboseTip({
      date: '2026-07-21',
      source: "Louie's",
      category: 'Tips',
      note: '',
      creditCardTips: 80,
      cashTips: 43.45,
      shiftType: 'bar',
      tipsIn: [{ name: 'Jake', amount: 20 }],
      tipsOut: [],
      moneyOwed: [],
    });

    expect(rpcMock).toHaveBeenCalledWith('create_verbose_tip', {
      p_date: '2026-07-21',
      p_source: "Louie's",
      p_category: 'Tips',
      p_note: '',
      p_credit_card_tips: 80,
      p_cash_tips: 43.45,
      p_shift_type: 'bar',
      p_tips_in: [{ name: 'Jake', amount: 20 }],
      p_tips_out: [],
      p_money_owed: [],
    });
    expect(tip.id).toBe(42);
  });
});
