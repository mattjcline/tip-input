import { supabase } from './supabase';
import type { Tip, TipDraft, TipTransfer, VerboseTipDraft } from '../types';

const TABLE = 'tip_input_tips';
const COLUMNS = 'id,date,source,amount,category,note,credit_card_tips,cash_tips,shift_type';
const COLUMNS_WITH_TRANSFERS = `${COLUMNS},transfers:tip_input_transfers(id,kind,name,amount)`;

// PostgREST returns `numeric` columns as strings (to avoid float precision
// loss), so amounts need to be coerced back to numbers on every read.
type TransferRow = Omit<TipTransfer, 'amount'> & { amount: string };
type TipRow = Omit<Tip, 'amount' | 'creditCardTips' | 'cashTips' | 'shiftType' | 'transfers'> & {
  amount: string;
  credit_card_tips: string | null;
  cash_tips: string | null;
  shift_type: Tip['shiftType'];
  transfers?: TransferRow[];
};

function toTip(row: TipRow): Tip {
  return {
    ...row,
    amount: Number(row.amount),
    creditCardTips: row.credit_card_tips === null ? null : Number(row.credit_card_tips),
    cashTips: row.cash_tips === null ? null : Number(row.cash_tips),
    shiftType: row.shift_type,
    transfers: (row.transfers ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
  };
}

// Simple (non-verbose) writes never set these - default explicitly so
// TipDraft's optional fields don't send `undefined` to PostgREST.
function toInsertPayload(draft: TipDraft) {
  return {
    date: draft.date,
    source: draft.source,
    amount: draft.amount,
    category: draft.category,
    note: draft.note,
    credit_card_tips: draft.creditCardTips ?? null,
    cash_tips: draft.cashTips ?? null,
    shift_type: draft.shiftType ?? null,
  };
}

async function fetchTipById(id: number): Promise<Tip> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS_WITH_TRANSFERS)
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return toTip(data as unknown as TipRow);
}

export async function fetchTips(): Promise<Tip[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(COLUMNS_WITH_TRANSFERS)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as TipRow[]).map(toTip);
}

export async function addTip(draft: TipDraft): Promise<Tip> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(toInsertPayload(draft))
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toTip(data as unknown as TipRow);
}

export async function updateTip(tip: Tip): Promise<Tip> {
  const { id } = tip;
  const { data, error } = await supabase
    .from(TABLE)
    .update(toInsertPayload(tip))
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toTip(data as unknown as TipRow);
}

export async function deleteTip(id: number): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addVerboseTip(payload: VerboseTipDraft): Promise<Tip> {
  const { data, error } = await supabase.rpc('create_verbose_tip', {
    p_date: payload.date,
    p_source: payload.source,
    p_category: payload.category,
    p_note: payload.note,
    p_credit_card_tips: payload.creditCardTips,
    p_cash_tips: payload.cashTips,
    p_shift_type: payload.shiftType,
    p_tips_in: payload.tipsIn,
    p_tips_out: payload.tipsOut,
    p_money_owed: payload.moneyOwed,
  });
  if (error) throw new Error(error.message);
  return fetchTipById((data as { id: number }).id);
}
