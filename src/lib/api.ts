import { supabase } from './supabase';
import type { Tip, TipDraft } from '../types';

const COLUMNS = 'id,date,source,amount,category,note';

// PostgREST returns `numeric` columns as strings (to avoid float precision
// loss), so `amount` needs to be coerced back to a number on every read.
type TipRow = Omit<Tip, 'amount'> & { amount: string };

function toTip(row: TipRow): Tip {
  return { ...row, amount: Number(row.amount) };
}

export async function fetchTips(): Promise<Tip[]> {
  const { data, error } = await supabase
    .from('tips')
    .select(COLUMNS)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as TipRow[]).map(toTip);
}

export async function addTip(draft: TipDraft): Promise<Tip> {
  const { data, error } = await supabase.from('tips').insert(draft).select(COLUMNS).single();
  if (error) throw new Error(error.message);
  return toTip(data as unknown as TipRow);
}

export async function updateTip(tip: Tip): Promise<Tip> {
  const { id, ...fields } = tip;
  const { data, error } = await supabase
    .from('tips')
    .update(fields)
    .eq('id', id)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toTip(data as unknown as TipRow);
}

export async function deleteTip(id: number): Promise<void> {
  const { error } = await supabase.from('tips').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
