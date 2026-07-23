import { useCallback, useEffect, useState } from 'react';
import { addTip, addVerboseTip, deleteTip, fetchTips, updateTip } from '../lib/api';
import type { Tip, TipDraft, VerboseTipDraft } from '../types';

export function useTips() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTips();
      setTips(data.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(async (draft: TipDraft) => {
    const optimisticId = -Date.now();
    const optimisticTip: Tip = {
      ...draft,
      id: optimisticId,
      creditCardTips: draft.creditCardTips ?? null,
      cashTips: draft.cashTips ?? null,
      shiftType: draft.shiftType ?? null,
      transfers: [],
    };
    setTips((prev) => [optimisticTip, ...prev]);
    try {
      const saved = await addTip(draft);
      setTips((prev) => prev.map((t) => (t.id === optimisticId ? saved : t)));
    } catch (err) {
      setTips((prev) => prev.filter((t) => t.id !== optimisticId));
      throw err;
    }
  }, []);

  const createVerbose = useCallback(async (payload: VerboseTipDraft) => {
    const optimisticId = -Date.now();
    const optimisticTip: Tip = {
      ...payload,
      id: optimisticId,
      amount: (payload.creditCardTips ?? 0) + (payload.cashTips ?? 0),
      transfers: [
        ...payload.tipsIn.map((t, i) => ({ ...t, id: -Date.now() - i - 1, kind: 'tip_in' as const })),
        ...payload.tipsOut.map((t, i) => ({ ...t, id: -Date.now() - i - 101, kind: 'tip_out' as const })),
        ...payload.moneyOwed.map((t, i) => ({ ...t, id: -Date.now() - i - 201, kind: 'money_owed' as const })),
      ],
    };
    setTips((prev) => [optimisticTip, ...prev]);
    try {
      const saved = await addVerboseTip(payload);
      setTips((prev) => prev.map((t) => (t.id === optimisticId ? saved : t)));
    } catch (err) {
      setTips((prev) => prev.filter((t) => t.id !== optimisticId));
      throw err;
    }
  }, []);

  const update = useCallback(async (tip: Tip) => {
    const previous = tips;
    setTips((prev) => prev.map((t) => (t.id === tip.id ? tip : t)));
    try {
      await updateTip(tip);
    } catch (err) {
      setTips(previous);
      throw err;
    }
  }, [tips]);

  const remove = useCallback(async (id: number) => {
    const previous = tips;
    setTips((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTip(id);
    } catch (err) {
      setTips(previous);
      throw err;
    }
  }, [tips]);

  return { tips, loading, error, reload, create, createVerbose, update, remove };
}
