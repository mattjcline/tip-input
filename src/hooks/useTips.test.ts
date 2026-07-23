import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTips } from './useTips';
import * as api from '../lib/api';
import type { Tip, TipDraft } from '../types';

vi.mock('../lib/api');

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

const draft: TipDraft = {
  date: '2026-07-22',
  source: "Louie's",
  amount: 50,
  category: 'Tips',
  note: '',
};

describe('useTips', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(api.fetchTips).mockResolvedValue([]);
  });

  it('loads and sorts tips on mount', async () => {
    vi.mocked(api.fetchTips).mockResolvedValue([
      makeTip({ id: 1, date: '2026-07-20' }),
      makeTip({ id: 2, date: '2026-07-22' }),
    ]);

    const { result } = renderHook(() => useTips());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tips.map((t) => t.id)).toEqual([2, 1]); // newest date first
  });

  it('optimistically adds a tip, then reconciles with the server response', async () => {
    const { result } = renderHook(() => useTips());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const saved = makeTip({ id: 99, ...draft });
    vi.mocked(api.addTip).mockResolvedValue(saved);

    await act(async () => {
      await result.current.create(draft);
    });

    expect(result.current.tips).toEqual([saved]);
  });

  it('rolls back the optimistic tip if the create request fails', async () => {
    const { result } = renderHook(() => useTips());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(api.addTip).mockRejectedValue(new Error('network down'));

    await act(async () => {
      await expect(result.current.create(draft)).rejects.toThrow('network down');
    });

    expect(result.current.tips).toEqual([]);
  });

  it('optimistically removes a tip, then rolls back if the delete request fails', async () => {
    vi.mocked(api.fetchTips).mockResolvedValue([makeTip({ id: 1 })]);
    const { result } = renderHook(() => useTips());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(api.deleteTip).mockRejectedValue(new Error('nope'));

    await act(async () => {
      await expect(result.current.remove(1)).rejects.toThrow('nope');
    });

    expect(result.current.tips).toHaveLength(1); // restored after rollback
  });
});
